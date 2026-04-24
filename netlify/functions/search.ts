import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

/**
 * /api/search?q=<query>
 *
 * Internal full-text search backed by Postgres tsvector + GIN indexes.
 * No external search infrastructure required.
 *
 * Flow:
 *   1. Validate the Bearer JWT via supabase.auth.getUser()
 *   2. Call search_records(query_text, uid) Postgres RPC
 *   3. Return ranked SearchResult[] with type, title, snippet, id
 *
 * Future upgrade: to switch to Meilisearch, Typesense, OpenSearch, or
 * Elasticsearch — replace only the supabase.rpc() call below with an HTTP
 * fetch to the external engine. This endpoint's interface stays the same.
 */

const SUPABASE_URL  = process.env.SUPABASE_URL  ?? process.env.VITE_SUPABASE_URL  ?? '';
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON ?? process.env.VITE_SUPABASE_PK ?? '';

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
};

const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  // ── Input validation ────────────────────────────────────────────────────────
  const q = (event.queryStringParameters?.q ?? '').trim();
  if (q.length < 2) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Query must be at least 2 characters' }),
    };
  }

  // ── Auth ────────────────────────────────────────────────────────────────────
  const authHeader = (event.headers['authorization'] ?? event.headers['Authorization'] ?? '');
  if (!authHeader.startsWith('Bearer ')) {
    return {
      statusCode: 401,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Missing Authorization header' }),
    };
  }
  const token = authHeader.slice(7);

  if (!SUPABASE_URL || !SUPABASE_ANON) {
    console.error('[search] Missing SUPABASE_URL or SUPABASE_ANON_KEY env vars');
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Search service not configured' }),
    };
  }

  // Create a per-request Supabase client scoped to the caller's JWT.
  // The anon key is safe here — RLS and the uid parameter in search_records()
  // ensure users can only see their own records.
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });

  // Verify the JWT and resolve the user's UUID
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return {
      statusCode: 401,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Invalid or expired token' }),
    };
  }

  // ── Search ──────────────────────────────────────────────────────────────────
  // Uses the search_records() Postgres function defined in supabase-search-migration.sql.
  // Returns up to 20 results ranked by ts_rank descending.
  //
  // Future: replace this block with a fetch() to Meilisearch / Typesense /
  // OpenSearch / Elasticsearch without changing any caller code.
  const { data, error: rpcError } = await supabase.rpc('search_records', {
    query_text: q,
    uid: user.id,
  });

  if (rpcError) {
    console.error('[search] RPC error:', rpcError.message);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Search failed', detail: rpcError.message }),
    };
  }

  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({ results: data ?? [] }),
  };
};

export { handler };
