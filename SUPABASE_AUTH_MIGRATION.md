# Supabase Authentication & Authorization Migration

This document provides SQL migrations for implementing role-based authentication and authorization in Artist OS.

## Overview

The migration includes:
1. **Profiles Table** - Store user profile data including role
2. **Auto-Create Trigger** - Automatically create profile on user signup
3. **Row-Level Security (RLS) Policies** - Secure data access by role and user

## SQL Migrations

### 1. Create Profiles Table

```sql
-- Create the profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  full_name TEXT,
  role TEXT CHECK (role IN ('artist', 'manager')) DEFAULT 'artist',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Comment on table
COMMENT ON TABLE profiles IS 'User profiles with role-based access control';
COMMENT ON COLUMN profiles.id IS 'User ID from auth.users';
COMMENT ON COLUMN profiles.role IS 'User role: artist or manager';
```

### 2. Create Auto-Profile Function

This function automatically creates a profile when a new user signs up.

```sql
-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.user_metadata->>'full_name', new.email),
    'artist' -- Default role for new signups
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

-- Create trigger for on_auth_user_created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 3. Row-Level Security (RLS) Policies

#### Profiles Table Policies

```sql
-- Policy 1: Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Policy 2: Users can update their own profile (except role)
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id 
    AND role = (SELECT role FROM profiles WHERE id = auth.uid()) -- Cannot change own role
  );

-- Policy 3: Managers can view all profiles
CREATE POLICY "Managers can view all profiles"
  ON profiles
  FOR SELECT
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'manager'
  );

-- Policy 4: Admin/manager role modifications (requires service role or trigger)
-- Note: Role changes should only be made by admin via service_role or manual database updates
CREATE POLICY "Admins can update profiles"
  ON profiles
  FOR UPDATE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'manager'
  );
```

### 4. Enable RLS for Auth Tables (Optional)

```sql
-- Restrict access to auth.users metadata
-- Note: This is typically managed by Supabase JWT tokens
-- Uncomment if you want stricter auth table access

-- ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY "Users can view own auth data"
--   ON auth.users
--   FOR SELECT
--   USING (auth.uid() = id);
```

### 5. Policies for Tasks Table (Future)

When adding a tasks table, apply these policies:

```sql
-- Create tasks table with role-based access
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT CHECK (status IN ('todo', 'in_progress', 'done')) DEFAULT 'todo',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Tasks RLS Policies

-- Artists can view tasks assigned to them
CREATE POLICY "Artists can view assigned tasks"
  ON tasks
  FOR SELECT
  USING (
    auth.uid() = assigned_to 
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'artist'
  );

-- Managers can view all tasks
CREATE POLICY "Managers can view all tasks"
  ON tasks
  FOR SELECT
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'manager'
  );

-- Managers can create and update tasks
CREATE POLICY "Managers can create tasks"
  ON tasks
  FOR INSERT
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'manager'
    AND user_id = auth.uid()
  );

CREATE POLICY "Managers can update tasks"
  ON tasks
  FOR UPDATE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'manager'
  );
```

### 6. Policies for Ideas/Releases Tables (Future)

```sql
-- For ideas or releases where artists create content

-- Artists can create ideas/releases
CREATE POLICY "Artists can create ideas"
  ON ideas -- Replace with actual table name
  FOR INSERT
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'artist'
    AND created_by = auth.uid()
  );

-- Artists can view and edit their own ideas
CREATE POLICY "Artists can view own ideas"
  ON ideas
  FOR SELECT
  USING (
    created_by = auth.uid() 
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'manager'
  );

-- Managers can view all ideas, read-only
CREATE POLICY "Managers can view all ideas"
  ON ideas
  FOR SELECT
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'manager'
  );
```

## Implementation Steps

### Step 1: Set Up in Supabase Dashboard

1. Go to **SQL Editor** in your Supabase project
2. Create a new query
3. Copy and paste the migrations below in order
4. Execute each migration

### Step 2: Execute Migrations in Order

Run these SQL blocks in the following order:

```sql
-- 1. Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  full_name TEXT,
  role TEXT CHECK (role IN ('artist', 'manager')) DEFAULT 'artist',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
```

```sql
-- 2. Create auto-create trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.user_metadata->>'full_name', new.email),
    'artist'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

```sql
-- 3. Create RLS policies
CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id 
    AND role = (SELECT role FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Managers can view all profiles"
  ON profiles
  FOR SELECT
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'manager'
  );

CREATE POLICY "Admins can update profiles"
  ON profiles
  FOR UPDATE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'manager'
  );
```

### Step 3: Test the Setup

1. **Sign up a new user** via the app's Unauthorized/login page
2. **Verify profile creation** by checking the profiles table
3. **Test role retrieval** by logging in and checking the top bar display
4. **Test logout** to ensure signOut() works properly

## Troubleshooting

### Issue: "Permission denied" on profiles table

**Solution**: Ensure RLS policies are correctly set up and the user's auth token is being used.

### Issue: Profile not created on signup

**Solution**: 
1. Check if the trigger exists: `SELECT * FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created';`
2. Verify the function exists: `SELECT * FROM pg_proc WHERE proname = 'handle_new_user';`
3. Check Supabase logs for errors during signup

### Issue: "Cannot change own role"

**Solution**: This is expected behavior. To change roles:
1. Use Supabase dashboard > SQL Editor
2. Run: `UPDATE profiles SET role = 'manager' WHERE email = 'user@example.com';`
3. Or use service_role key in your backend for admin operations

## Security Considerations

1. **RLS Policies**: Always enable RLS on sensitive tables
2. **Role Changes**: Only allow admins to modify user roles (via manual database updates or service_role)
3. **Email Verification**: Consider adding email verification before granting manager role
4. **Audit Logging**: Consider adding created_at and updated_at timestamps with triggers
5. **Service Role**: Use service_role key only in backend code, never expose to client

## Extending the Model

### Adding Additional Roles

```sql
-- 1. Add new role constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('artist', 'manager', 'admin', 'collaborator'));

-- 2. Create new policies for the new role
-- Example for admin role:
CREATE POLICY "Admins can do everything"
  ON profiles
  FOR ALL
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );
```

### Adding Organization/Team Support

```sql
-- Future: Add team support for managers to manage multiple artists
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  UNIQUE(team_id, user_id)
);
```

## Client-Side Integration

After running these migrations, your app will:

1. ✅ Automatically create profiles on Supabase auth.users creation
2. ✅ Store user role ('artist' or 'manager') in profiles table
3. ✅ Block users from changing their own role
4. ✅ Restrict profile visibility based on role via RLS
5. ✅ Allow managers to view all profiles

## Testing Checklist

- [ ] Profiles table created with correct schema
- [ ] Auto-create trigger working (new users get profile automatically)
- [ ] RLS policies enabled and working
- [ ] Users can view their own profile
- [ ] Users cannot modify their own role
- [ ] Managers can view all profiles
- [ ] Sign up → auto profile creation → login → role display works end-to-end

---

**Last Updated**: 2026-04-14
**Supabase Version**: Latest
**PostgreSQL Version**: 13+
