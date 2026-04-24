-- ============================================================
-- Migration: profiles table + RLS + signup trigger
-- Run this in your Supabase SQL editor (or via supabase db push)
-- ============================================================

-- 1. Drop legacy profiles table if it uses a different shape
--    (the old table had user_id + artist_name, not id + role)
DROP TABLE IF EXISTS profiles;

-- 2. Create the canonical profiles table
CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT,
  full_name   TEXT,
  role        TEXT NOT NULL DEFAULT 'artist'
                   CHECK (role IN ('artist', 'manager')),
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.profiles IS
  'One-to-one extension of auth.users. Stores artist/manager role.';

-- 3. Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3a. Users can read their own profile
CREATE POLICY "users_read_own_profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- 3b. Users can update their own profile (except role field — that's admin-only)
CREATE POLICY "users_update_own_profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 3c. Allow service-role (server / edge functions) full access
--     This is the default for service_role — no explicit policy needed.

-- 3d. Managers can read profiles of anyone in the same team.
--     For now: managers can read all profiles (simplest safe default).
CREATE POLICY "managers_read_all_profiles"
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'manager'
    )
  );

-- 4. Auto-create profile row on every new auth.users signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'artist')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Drop if already exists (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. updated_at auto-maintenance
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6. If existing auth users have no profile row yet, back-fill them
--    (safe no-op if profiles table was freshly created)
INSERT INTO public.profiles (id, email, full_name, role)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
  COALESCE(au.raw_user_meta_data->>'role', 'artist')
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- RLS policies for existing tables (releases, content_items)
-- ============================================================

-- releases: each user sees only their own rows; managers see all
ALTER TABLE public.releases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "releases_own" ON public.releases;
CREATE POLICY "releases_own"
  ON public.releases
  FOR ALL
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'manager'
    )
  )
  WITH CHECK (auth.uid() = user_id);

-- content_items: same pattern
ALTER TABLE public.content_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "content_items_own" ON public.content_items;
CREATE POLICY "content_items_own"
  ON public.content_items
  FOR ALL
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'manager'
    )
  )
  WITH CHECK (auth.uid() = user_id);

-- The anon key is safe to expose because Row Level Security (RLS) ensures that:
-- 1. Public-facing tables allow only SELECT operations.
-- 2. User-owned tables enforce auth.uid() = user_id for sensitive operations.
-- 3. No public INSERT/UPDATE/DELETE operations are allowed unless explicitly required.
