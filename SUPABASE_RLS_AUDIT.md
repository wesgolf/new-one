# Supabase RLS Audit Report

## Summary
This audit reviews the security of Supabase client usage and Row Level Security (RLS) policies for the following tables:
- `profiles`
- `releases`
- `integration_accounts`
- `sync_jobs`
- `tasks`

### Findings
1. **Supabase Client Security**:
   - Only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are exposed client-side.
   - No service role keys (`SUPABASE_SERVICE_ROLE_KEY`) are exposed in frontend code.

2. **RLS Policies**:
   - **Profiles Table**:
     - Users can read and update their own profiles.
     - Managers can read all profiles.
     - Service role has full access (default behavior).
   - **Releases Table**:
     - Authenticated users can read all releases.
     - Only the owner can insert.
   - **Integration Accounts and Sync Jobs**:
     - Users manage their own rows.
   - **Tasks Table**:
     - Authenticated users can read all tasks.
     - Users can insert tasks where they are the creator.
     - Users can update tasks they are assigned to or created.
     - Users can delete only tasks they created.

3. **Public-Facing Tables**:
   - `profiles`, `releases`, and `tasks` allow `SELECT` for authenticated users.

4. **User-Owned Tables**:
   - Policies enforce `auth.uid() = user_id` or `auth.uid() = created_by` for sensitive operations.

5. **No Public `INSERT/UPDATE/DELETE`**:
   - Policies restrict these operations to the owner or specific roles.

### Required Changes
1. **Ensure Consistency**:
   - Verify that all user-owned tables enforce `auth.uid() = user_id`.
   - Ensure no public `INSERT/UPDATE/DELETE` operations are allowed unless explicitly required.

2. **Add Missing Policies**:
   - Confirm `tracks` and `shows` tables follow similar RLS patterns.

3. **Documentation**:
   - Add comments explaining why exposing the anon key is safe with proper RLS.

### Recommendations
- Regularly review RLS policies to ensure they align with security requirements.
- Avoid exposing sensitive keys (e.g., service role keys) in frontend code.
- Use Supabase Vault for storing sensitive tokens securely.

---

## Appendix
### Comments Added
- Comments explaining the safety of exposing the anon key were added to:
  - `/supabase-baseline-v3.sql`

### Files Reviewed
- `/src/lib/supabase.ts`
- `/src/lib/envConfig.ts`
- `/supabase-baseline-v3.sql`
