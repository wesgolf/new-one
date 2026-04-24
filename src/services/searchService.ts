import { supabase } from '../lib/supabase';

// ─────────────────────────────────────────────────────────────────────────────
// Artist OS — Internal Search Service
//
// Uses /api/search  →  Netlify function  →  Postgres search_records() RPC.
// No external search infrastructure. Cost: $0.
//
// Future upgrade paths (zero frontend changes required):
//   Meilisearch  — swap the fetch URL to a Meilisearch instance
//   Typesense    — same; adjust response mapping below
//   OpenSearch   — same; adjust response mapping below
//   Elasticsearch — same; adjust response mapping below
// ─────────────────────────────────────────────────────────────────────────────

export type SearchRecordType =
  | 'release'
  | 'idea'
  | 'content'
  | 'goal'
  | 'opportunity'
  | 'note'
  | 'resource';

export interface SearchResult {
  /** Source record UUID */
  id: string;
  /** Discriminator matching the table / entity type */
  record_type: SearchRecordType;
  /** Primary display text (title, name, or first 60 chars of content) */
  title: string;
  /** Context snippet (first 150 chars of the most relevant text field) */
  snippet: string;
  /** ts_rank score — higher is more relevant */
  rank: number;
}

/**
 * Perform a full-text search across all indexed record types for the
 * currently authenticated user.
 *
 * @param query - The search string. Supports phrases ("lo-fi beats"),
 *                negation (-trap), and OR (hip-hop OR RnB) via
 *                websearch_to_tsquery on the backend.
 * @returns Ranked SearchResult[] capped at 20 items, or [] on auth failure.
 */
export async function searchRecords(query: string): Promise<SearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return [];

  const response = await fetch(
    `/api/search?q=${encodeURIComponent(trimmed)}`,
    {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    },
  );

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.error ?? `Search request failed (${response.status})`);
  }

  const json = await response.json();
  return (json.results ?? []) as SearchResult[];
}

/**
 * AI-agent context retrieval helper.
 *
 * Pass the agent's current intent/question as the query and the user's id
 * is resolved automatically from the active session.
 *
 * Returns a compact text block suitable for injection into an LLM prompt:
 *   [release] Summer Anthem — drafted as a potential single for Q3...
 *   [goal]    100k streams — target 100 000 streams by December...
 */
export async function getAgentContext(query: string): Promise<string> {
  const results = await searchRecords(query);
  if (results.length === 0) return '';

  return results
    .map(r => `[${r.record_type}] ${r.title}${r.snippet ? ` — ${r.snippet}` : ''}`)
    .join('\n');
}
