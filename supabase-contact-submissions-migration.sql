-- ─── contact_submissions ──────────────────────────────────────────────────────
-- Stores public contact form submissions from the artist's PublicHub page.
-- Anyone can INSERT; only authenticated users can SELECT.

CREATE TABLE IF NOT EXISTS contact_submissions (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT        NOT NULL,
  email       TEXT        NOT NULL,
  subject     TEXT,
  message     TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

-- Public visitors can submit the form
CREATE POLICY "Public insert contact_submissions"
  ON contact_submissions
  FOR INSERT
  WITH CHECK (true);

-- Only authenticated users (artists / managers) can read submissions
CREATE POLICY "Authenticated read contact_submissions"
  ON contact_submissions
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Index for reading newest submissions first
CREATE INDEX IF NOT EXISTS contact_submissions_created_at_idx
  ON contact_submissions (created_at DESC);
