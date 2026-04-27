-- Migration: add songstats_track_id and soundcloud_stats columns to releases
-- Safe to run multiple times (uses IF NOT EXISTS)

ALTER TABLE releases
  ADD COLUMN IF NOT EXISTS songstats_track_id text;

ALTER TABLE releases
  ADD COLUMN IF NOT EXISTS soundcloud_stats jsonb;

CREATE INDEX IF NOT EXISTS releases_songstats_track_id_idx
  ON releases (songstats_track_id)
  WHERE songstats_track_id IS NOT NULL;
