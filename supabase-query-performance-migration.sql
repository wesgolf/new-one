-- Query-shape indexes for common list / dashboard reads.
-- Non-destructive: only additive indexes.

-- Releases list + release-driven dashboard reads
CREATE INDEX IF NOT EXISTS idx_releases_user_release_date_created_at
  ON public.releases (user_id, release_date DESC NULLS LAST, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_releases_user_status_release_date
  ON public.releases (user_id, status, release_date DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_releases_user_updated_at
  ON public.releases (user_id, updated_at DESC);

-- Dashboard / planning lists
CREATE INDEX IF NOT EXISTS idx_content_items_user_scheduled_date
  ON public.content_items (user_id, scheduled_date ASC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_todos_user_due_date
  ON public.todos (user_id, due_date ASC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_goals_user_deadline
  ON public.goals (user_id, deadline ASC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_shows_user_date
  ON public.shows (user_id, date ASC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_meetings_user_date
  ON public.meetings (user_id, date ASC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_opportunities_user_created_at
  ON public.opportunities (user_id, created_at DESC NULLS LAST);
