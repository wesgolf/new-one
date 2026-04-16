-- ============================================================
-- Sync Architecture Migration
-- Run in Supabase SQL Editor
-- ============================================================

-- ── integration_accounts ─────────────────────────────────────
-- Tracks per-user connection status for each external provider.
-- Sensitive tokens are NOT stored here; they remain in
-- localStorage (client) or Supabase Vault (server) when added.

CREATE TABLE IF NOT EXISTS public.integration_accounts (
  id                   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider             TEXT          NOT NULL
                         CHECK (provider IN ('spotify','soundcloud','zernio','youtube','tiktok','instagram')),
  connection_status    TEXT          NOT NULL DEFAULT 'disconnected'
                         CHECK (connection_status IN ('connected','disconnected','expired','error')),
  account_display_name TEXT,
  account_external_id  TEXT,
  -- token_expires_at is nullable; populate only when the token
  -- expiry is known from the OAuth response.
  token_expires_at     TIMESTAMPTZ,
  last_synced_at       TIMESTAMPTZ,
  last_sync_status     TEXT          CHECK (last_sync_status IN ('success','failed','running')),
  last_error           TEXT,
  metadata             JSONB         NOT NULL DEFAULT '{}',
  created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  UNIQUE (user_id, provider)
);

-- ── sync_jobs ─────────────────────────────────────────────────
-- Append-only audit log of every sync attempt.

CREATE TABLE IF NOT EXISTS public.sync_jobs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider        TEXT        NOT NULL,
  job_type        TEXT        NOT NULL DEFAULT 'full_sync',
  status          TEXT        NOT NULL DEFAULT 'queued'
                    CHECK (status IN ('queued','running','success','failed')),
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  error_message   TEXT,
  metadata        JSONB       NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast per-user + per-provider lookups
CREATE INDEX IF NOT EXISTS sync_jobs_user_provider
  ON public.sync_jobs (user_id, provider, created_at DESC);

-- ── Row Level Security ────────────────────────────────────────

ALTER TABLE public.integration_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_jobs             ENABLE ROW LEVEL SECURITY;

-- integration_accounts: each user manages their own rows
CREATE POLICY "users_manage_own_integrations"
  ON public.integration_accounts
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- sync_jobs: each user reads/inserts/updates their own rows
CREATE POLICY "users_read_own_sync_jobs"
  ON public.sync_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_sync_jobs"
  ON public.sync_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own_sync_jobs"
  ON public.sync_jobs FOR UPDATE
  USING (auth.uid() = user_id);

-- ── updated_at trigger ────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_integration_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS integration_accounts_updated_at ON public.integration_accounts;
CREATE TRIGGER integration_accounts_updated_at
  BEFORE UPDATE ON public.integration_accounts
  FOR EACH ROW EXECUTE FUNCTION set_integration_updated_at();
