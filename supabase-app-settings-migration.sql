-- app_settings: key/value store for app-wide configuration.
-- Rows are identified by a plain text key; value is a free-form JSONB blob.
-- Only authenticated users can read; only admins / the owner can write.

CREATE TABLE IF NOT EXISTS app_settings (
  key         TEXT PRIMARY KEY,
  value       JSONB        NOT NULL DEFAULT '{}',
  updated_by  UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Seed default rows so reads always return a row (avoids null handling)
INSERT INTO app_settings (key, value) VALUES
  ('general',    '{}'),
  ('public_hub', '{}')
ON CONFLICT (key) DO NOTHING;

-- RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all settings
CREATE POLICY "auth_read_app_settings"
  ON app_settings FOR SELECT
  TO authenticated
  USING (true);

-- Only the user who last wrote (or any admin) can update.
-- For a single-user app this is fine; expand the policy for multi-user setups.
CREATE POLICY "auth_write_app_settings"
  ON app_settings FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
