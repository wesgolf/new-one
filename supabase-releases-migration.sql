-- ──────────────────────────────────────────────────────────────────────────────
-- Releases table — extended metadata-driven schema
-- Run in Supabase SQL editor
-- ──────────────────────────────────────────────────────────────────────────────

-- Main releases table
CREATE TABLE IF NOT EXISTS releases (
  id                       uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                  uuid REFERENCES auth.users ON DELETE SET NULL,
  title                    text NOT NULL,
  artist_name              text,
  release_date             date,
  cover_art_url            text,
  bpm                      integer,
  musical_key              text,
  isrc                     text,
  spotify_track_id         text,
  soundcloud_track_id      text,
  notes                    text,
  status                   text NOT NULL DEFAULT 'unreleased'
                             CHECK (status IN ('unreleased', 'scheduled', 'released')),
  -- Playlisting (scaffold for future analytics integrations)
  playlist_count           integer,
  notable_playlists        text[],
  recent_playlist_adds     integer,
  playlist_source_provider text,
  -- Timestamps
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION set_release_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_releases_updated_at ON releases;
CREATE TRIGGER trg_releases_updated_at
  BEFORE UPDATE ON releases
  FOR EACH ROW EXECUTE FUNCTION set_release_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_releases_user_id      ON releases (user_id);
CREATE INDEX IF NOT EXISTS idx_releases_release_date ON releases (release_date DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_releases_status        ON releases (status);

-- ── Row-Level Security ────────────────────────────────────────────────────────
ALTER TABLE releases ENABLE ROW LEVEL SECURITY;

-- All authenticated users of the same workspace can read
DROP POLICY IF EXISTS releases_select ON releases;
CREATE POLICY releases_select ON releases
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only the owner can insert
DROP POLICY IF EXISTS releases_insert ON releases;
CREATE POLICY releases_insert ON releases
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Only the owner can update
DROP POLICY IF EXISTS releases_update ON releases;
CREATE POLICY releases_update ON releases
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Only the owner can delete
DROP POLICY IF EXISTS releases_delete ON releases;
CREATE POLICY releases_delete ON releases
  FOR DELETE
  USING (auth.uid() = user_id);

-- ── Storage bucket (create manually in dashboard) ─────────────────────────────
-- Name:    release-artwork
-- Public:  true
-- Max size per file: 10 MB
-- Allowed MIME types: image/jpeg, image/png, image/webp, image/gif

-- ── Migrate existing data ────────────────────────────────────────────────────
-- If your releases table already exists with the old JSON-blob schema,
-- run these ALTER TABLE statements to add any missing columns:
ALTER TABLE releases ADD COLUMN IF NOT EXISTS bpm                      integer;
ALTER TABLE releases ADD COLUMN IF NOT EXISTS musical_key              text;
ALTER TABLE releases ADD COLUMN IF NOT EXISTS isrc                     text;
ALTER TABLE releases ADD COLUMN IF NOT EXISTS artist_name              text;
ALTER TABLE releases ADD COLUMN IF NOT EXISTS spotify_track_id         text;
ALTER TABLE releases ADD COLUMN IF NOT EXISTS soundcloud_track_id      text;
ALTER TABLE releases ADD COLUMN IF NOT EXISTS notes                    text;
ALTER TABLE releases ADD COLUMN IF NOT EXISTS playlist_count           integer;
ALTER TABLE releases ADD COLUMN IF NOT EXISTS notable_playlists        text[];
ALTER TABLE releases ADD COLUMN IF NOT EXISTS recent_playlist_adds     integer;
ALTER TABLE releases ADD COLUMN IF NOT EXISTS playlist_source_provider text;

-- Back-fill BPM and key from legacy JSONB columns
UPDATE releases
SET
  bpm         = COALESCE(bpm, (production->>'bpm')::integer),
  musical_key = COALESCE(musical_key, production->>'key'),
  isrc        = COALESCE(isrc, distribution->>'isrc'),
  artist_name = COALESCE(artist_name, artist),
  notes       = COALESCE(notes, rationale)
WHERE
  bpm IS NULL OR musical_key IS NULL;

-- Normalise status values from the old vocabulary
UPDATE releases
SET status = CASE
  WHEN status IN ('idea', 'production', 'mastered', 'ready') THEN 'unreleased'
  WHEN status = 'scheduled'                                   THEN 'scheduled'
  WHEN status = 'released'                                    THEN 'released'
  ELSE 'unreleased'
END
WHERE status NOT IN ('unreleased', 'scheduled', 'released');
