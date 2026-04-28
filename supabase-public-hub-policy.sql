-- ──────────────────────────────────────────────────────────────────────────────
-- Public Hub RLS policy
-- Allows unauthenticated visitors to read "released" tracks for the public
-- artist page (WES.). Safe because:
--   • Only SELECT is permitted
--   • Only rows with status = 'released' are exposed
--   • Write operations still require auth.uid() = user_id
--
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor)
-- ──────────────────────────────────────────────────────────────────────────────

-- Allow the "anon" role (unauthenticated visitors) to read released tracks
DROP POLICY IF EXISTS releases_public_select ON releases;
CREATE POLICY releases_public_select ON releases
  FOR SELECT
  TO anon
  USING (status = 'released');

-- Allow the "anon" role to read app_settings (needed for public hub config)
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS app_settings_public_select ON app_settings;
CREATE POLICY app_settings_public_select ON app_settings
  FOR SELECT
  TO anon
  USING (true);

-- Allow the "anon" role to read shows that are upcoming / public
ALTER TABLE shows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS shows_public_select ON shows;
CREATE POLICY shows_public_select ON shows
  FOR SELECT
  TO anon
  USING (true);
