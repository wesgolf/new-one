 -- ─────────────────────────────────────────────────────────────────────────────
-- Artist OS — Internal Full-Text Search Migration
-- Engine: Postgres tsvector + GIN (zero infrastructure cost)
-- Route:  /api/search?q=<query>  →  Netlify function  →  search_records RPC
-- ─────────────────────────────────────────────────────────────────────────────
--
-- WHY POSTGRES FTS FIRST
--   Supabase Postgres (v15) supports tsvector generated columns and GIN indexes
--   natively. No extra services, no extra cost, no extra ops complexity.
--
-- FUTURE UPGRADE PATHS (when scale demands it)
--   ┌─ Tier 1 · Self-hosted, free ─────────────────────────────────────────────
--   │  Meilisearch  https://meilisearch.com  — easiest to self-host, instant-
--   │               search UX, great ranking tuning. Run as a sidecar on Fly.io
--   │               or Railway; sync via Supabase DB webhooks.
--   │
--   │  Typesense    https://typesense.org   — similar to Meilisearch, stricter
--   │               schema, excellent typo tolerance.
--   │
--   ├─ Tier 2 · Managed, low cost ────────────────────────────────────────────
--   │  Algolia      https://algolia.com     — best-in-class hosted search,
--   │               generous free tier for small indices.
--   │
--   ├─ Tier 3 · Open-source, cloud ───────────────────────────────────────────
--   │  OpenSearch   https://opensearch.org  — AWS-sponsored Elasticsearch fork,
--   │               available on AWS Managed or self-hosted.
--   │
--   └─ Tier 4 · Enterprise ────────────────────────────────────────────────────
--      Elasticsearch https://elastic.co    — full ML ranking, vector search,
--                    observability stack. High ops overhead.
--
-- MIGRATION STRATEGY (zero frontend changes required)
--   When upgrading: replace only the body of search_records() below to call the
--   external engine via HTTP. The Netlify function and all UI components keep
--   the same interface — SearchResult[] with { id, record_type, title, snippet, rank }.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. tsvector GENERATED columns + GIN indexes ───────────────────────────────
-- Using GENERATED ALWAYS AS STORED so Postgres maintains the vectors automatically.
-- No application-level trigger logic needed.

-- releases ────────────────────────────────────────────────────────────────────
ALTER TABLE releases
  ADD COLUMN IF NOT EXISTS fts_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english'::regconfig,
      coalesce(title,       '') || ' ' ||
      coalesce(notes,       '') || ' ' ||
      coalesce(rationale,   '')
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS releases_fts_idx ON releases USING GIN (fts_vector);

-- ideas ───────────────────────────────────────────────────────────────────────
ALTER TABLE ideas
  ADD COLUMN IF NOT EXISTS fts_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english'::regconfig,
      coalesce(title,                         '') || ' ' ||
      coalesce(description,                   '') || ' ' ||
      coalesce(genre,                         '') || ' ' ||
      coalesce(mood,                          '')
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS ideas_fts_idx ON ideas USING GIN (fts_vector);

-- goals ───────────────────────────────────────────────────────────────────────
ALTER TABLE goals
  ADD COLUMN IF NOT EXISTS fts_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english'::regconfig,
      coalesce(title,       '') || ' ' ||
      coalesce(description, '')
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS goals_fts_idx ON goals USING GIN (fts_vector);

-- content_items (only if table exists) ────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'content_items') THEN
    ALTER TABLE content_items
      ADD COLUMN IF NOT EXISTS fts_vector tsvector
      GENERATED ALWAYS AS (
        to_tsvector('english'::regconfig,
          coalesce(title,    '') || ' ' ||
          coalesce(hook,     '') || ' ' ||
          coalesce(caption,  '') || ' ' ||
          coalesce(notes,    '')
        )
      ) STORED;
    CREATE INDEX IF NOT EXISTS content_items_fts_idx ON content_items USING GIN (fts_vector);
  END IF;
END $$;

-- opportunities (only if table exists) ────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'opportunities') THEN
    ALTER TABLE opportunities
      ADD COLUMN IF NOT EXISTS fts_vector tsvector
      GENERATED ALWAYS AS (
        to_tsvector('english'::regconfig,
          coalesce(name,                    '') || ' ' ||
          coalesce(notes,                   '') || ' ' ||
          coalesce(last_interaction_notes,  '') || ' ' ||
          coalesce(contact,                 '')
        )
      ) STORED;
    CREATE INDEX IF NOT EXISTS opportunities_fts_idx ON opportunities USING GIN (fts_vector);
  END IF;
END $$;

-- inbox (only if table exists) ────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'inbox') THEN
    ALTER TABLE inbox
      ADD COLUMN IF NOT EXISTS fts_vector tsvector
      GENERATED ALWAYS AS (
        to_tsvector('english'::regconfig, coalesce(content, ''))
      ) STORED;
    CREATE INDEX IF NOT EXISTS inbox_fts_idx ON inbox USING GIN (fts_vector);
  END IF;
END $$;

-- bot_resources (only if table exists) ────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bot_resources') THEN
    ALTER TABLE bot_resources
      ADD COLUMN IF NOT EXISTS fts_vector tsvector
      GENERATED ALWAYS AS (
        to_tsvector('english'::regconfig,
          coalesce(title,   '') || ' ' ||
          coalesce(content, '')
        )
      ) STORED;
    CREATE INDEX IF NOT EXISTS bot_resources_fts_idx ON bot_resources USING GIN (fts_vector);
  END IF;
END $$;


-- ── 2. Unified searchable_records view ────────────────────────────────────────
CREATE OR REPLACE VIEW searchable_records AS
  SELECT id, user_id, 'release'::text     AS record_type,
    title,
    coalesce(notes, rationale, '')         AS snippet,
    fts_vector,
    created_at
  FROM releases

  UNION ALL

  SELECT id, user_id, 'idea'::text,
    title,
    coalesce(description, '')              AS snippet,
    fts_vector,
    created_at
  FROM ideas

  UNION ALL

  SELECT id, user_id, 'goal'::text,
    title,
    coalesce(description, '')              AS snippet,
    fts_vector,
    created_at
  FROM goals;


-- ── 3. search_records() RPC ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION search_records(query_text TEXT, uid UUID)
RETURNS TABLE (
  id          UUID,
  record_type TEXT,
  title       TEXT,
  snippet     TEXT,
  rank        REAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tsq tsquery;
BEGIN
  BEGIN
    tsq := websearch_to_tsquery('english', query_text);
  EXCEPTION WHEN OTHERS THEN
    tsq := plainto_tsquery('english', query_text);
  END;

  IF tsq IS NULL OR uid IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT r.id, 'release'::TEXT, r.title,
      coalesce(left(r.notes, 150), left(r.rationale, 150), '')::TEXT AS snippet,
      ts_rank(r.fts_vector, tsq)::REAL                               AS rank
    FROM releases r
    WHERE r.user_id = uid AND r.fts_vector @@ tsq

    UNION ALL

    SELECT i.id, 'idea'::TEXT, i.title,
      coalesce(left(i.description, 150), '')::TEXT,
      ts_rank(i.fts_vector, tsq)::REAL
    FROM ideas i
    WHERE i.user_id = uid AND i.fts_vector @@ tsq

    UNION ALL

    SELECT g.id, 'goal'::TEXT, g.title,
      coalesce(left(g.description, 150), '')::TEXT,
      ts_rank(g.fts_vector, tsq)::REAL
    FROM goals g
    WHERE g.user_id = uid AND g.fts_vector @@ tsq

    ORDER BY rank DESC
    LIMIT 20;
END;
$$;

-- Grant execute to authenticated users (anon key + valid JWT)
GRANT EXECUTE ON FUNCTION search_records(TEXT, UUID) TO authenticated;
