import { Handler } from '@netlify/functions';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * POST /api/coach/context
 *
 * Server-side context retrieval for the Artist Coach AI.
 * Uses Postgres FTS (search_records RPC) + targeted queries for
 * analytics snapshots and calendar events — no external search infra.
 *
 * Request body: { question: string, page?: string, entityIds?: string[] }
 * Auth:         Authorization: Bearer <supabase-jwt>
 * Response:     { context: string, sources: string[] }
 *
 * ── Token budget ────────────────────────────────────────────────────────────
 * Total cap: ~3 000 chars ≈ 750 tokens @ 4 chars/token.
 * Breakdown:
 *   FTS results       1 500 chars  (up to 10 × 150 chars each)
 *   Analytics         500 chars    (last 2 report snapshots)
 *   Calendar          400 chars    (next 3 shows + 2 meetings)
 *   Hard total cap    3 000 chars
 *
 * ── Future upgrade paths ────────────────────────────────────────────────────
 * Replace the FTS block below with a fetch() to:
 *   Meilisearch  — POST /multi-search
 *   Typesense    — POST /multi_search
 *   OpenSearch   — POST /_msearch
 *   Elasticsearch — POST /_msearch
 * The rest of this function (auth, budget, logging, response shape) stays the same.
 */

// ── Env ───────────────────────────────────────────────────────────────────────
const SUPABASE_URL  = process.env.SUPABASE_URL  ?? process.env.VITE_SUPABASE_URL  ?? '';
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON ?? process.env.VITE_SUPABASE_PK ?? '';

// ── Token budget constants ────────────────────────────────────────────────────
const BUDGET_FTS_MAX_RESULTS = 10;
const BUDGET_SNIPPET_CHARS   = 150;   // per FTS result
const BUDGET_ANALYTICS_CHARS = 500;
const BUDGET_CALENDAR_CHARS  = 400;
const BUDGET_TOTAL_CHARS     = 3_000;

// ── Page → context priority map ──────────────────────────────────────────────
// Pages that should load specific sources first, even without FTS hits.
const PAGE_PRIORITY: Record<string, string[]> = {
  analytics:   ['analytics', 'goals'],
  calendar:    ['calendar', 'releases'],
  content:     ['content', 'analytics'],
  goals:       ['goals', 'releases'],
  releases:    ['releases', 'goals'],
  ideas:       ['ideas', 'releases'],
  network:     ['opportunities'],
  coach:       ['resources'],
};

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
};

// ── Shared builder ────────────────────────────────────────────────────────────

interface ContextResult {
  context: string;
  sources: string[];    // type labels — no sensitive content
}

async function buildContext(
  sb: SupabaseClient,
  uid: string,
  question: string,
  page: string,
  entityIds: string[],
): Promise<ContextResult> {
  const sources: string[] = [];
  const sections: string[] = [];
  let charBudget = BUDGET_TOTAL_CHARS;

  // ── 1. Full-text search across all indexed tables ─────────────────────────
  // search_records() is the Postgres RPC defined in supabase-search-migration.sql.
  // It queries: releases, ideas, content_items, goals, opportunities, inbox,
  // bot_resources — all indexed with tsvector + GIN.
  try {
    const { data: ftsRows, error: ftsErr } = await sb.rpc('search_records', {
      query_text: question.slice(0, 500), // guard against huge payloads
      uid,
    });

    if (!ftsErr && Array.isArray(ftsRows) && ftsRows.length > 0) {
      const rows = ftsRows.slice(0, BUDGET_FTS_MAX_RESULTS);
      const typesSeen = new Set<string>();

      // Group by type so the context block is readable
      const grouped: Record<string, typeof rows> = {};
      for (const r of rows) {
        grouped[r.record_type] = grouped[r.record_type] ?? [];
        grouped[r.record_type].push(r);
        typesSeen.add(r.record_type);
      }

      let ftsBlock = '';
      for (const [type, items] of Object.entries(grouped)) {
        const label = type.toUpperCase() + 'S';
        const lines = items.map((r) => {
          const snippet = (r.snippet as string ?? '').slice(0, BUDGET_SNIPPET_CHARS);
          return snippet ? `- ${r.title}: ${snippet}` : `- ${r.title}`;
        });
        ftsBlock += `${label}:\n${lines.join('\n')}\n\n`;
      }

      const allowedChars = Math.min(BUDGET_TOTAL_CHARS - BUDGET_ANALYTICS_CHARS - BUDGET_CALENDAR_CHARS, charBudget);
      if (ftsBlock.length > 0) {
        sections.push(ftsBlock.slice(0, allowedChars));
        charBudget -= Math.min(ftsBlock.length, allowedChars);
        sources.push(...Array.from(typesSeen));
      }
    }
  } catch (e) {
    // Non-fatal — FTS may not yet be deployed; fall through to targeted fetches
    console.warn('[coach-context] FTS unavailable, falling back to targeted queries:', (e as Error).message);
  }

  // ── 2. Analytics snapshots ────────────────────────────────────────────────
  // report_snapshots stores weekly/monthly roll-up JSONB. We extract a brief
  // summary (platform, period, top-level numeric fields) rather than the full blob.
  if (charBudget > 100) {
    try {
      const { data: snaps } = await sb
        .from('report_snapshots')
        .select('period_type, period_start, period_end, platform, data')
        .eq('user_id', uid)
        .order('period_start', { ascending: false })
        .limit(2);

      if (snaps && snaps.length > 0) {
        const lines = snaps.map((s) => {
          const d = (s.data ?? {}) as Record<string, unknown>;
          // Extract only numeric top-level keys from the JSONB blob (safe, no PII)
          const stats = Object.entries(d)
            .filter(([, v]) => typeof v === 'number')
            .slice(0, 5)
            .map(([k, v]) => `${k}: ${v}`)
            .join(', ');
          return `- ${s.platform ?? 'overall'} (${s.period_type} ${s.period_start}): ${stats || 'no numeric stats'}`;
        });

        const block = `ANALYTICS SNAPSHOTS:\n${lines.join('\n')}\n\n`;
        sections.push(block.slice(0, BUDGET_ANALYTICS_CHARS));
        charBudget -= Math.min(block.length, BUDGET_ANALYTICS_CHARS);
        sources.push('analytics');
      }
    } catch (e) {
      console.warn('[coach-context] analytics fetch skipped:', (e as Error).message);
    }
  }

  // ── 3. Calendar events (shows + meetings) ─────────────────────────────────
  // Fetch only upcoming events — past events are lower signal for planning.
  if (charBudget > 100) {
    const today = new Date().toISOString().slice(0, 10);
    try {
      const [showsRes, meetingsRes] = await Promise.all([
        sb.from('shows')
          .select('venue, date, status')
          .eq('user_id', uid)
          .gte('date', today)
          .order('date', { ascending: true })
          .limit(3),
        sb.from('meetings')
          .select('title, date, notes')
          .eq('user_id', uid)
          .gte('date', today)
          .order('date', { ascending: true })
          .limit(2),
      ]);

      const calLines: string[] = [];
      for (const s of showsRes.data ?? []) {
        calLines.push(`- Show @ ${s.venue} on ${s.date} (${s.status})`);
      }
      for (const m of meetingsRes.data ?? []) {
        calLines.push(`- Meeting: ${m.title} on ${m.date}`);
      }

      if (calLines.length > 0) {
        const block = `UPCOMING CALENDAR:\n${calLines.join('\n')}\n\n`;
        sections.push(block.slice(0, BUDGET_CALENDAR_CHARS));
        charBudget -= Math.min(block.length, BUDGET_CALENDAR_CHARS);
        sources.push('calendar');
      }
    } catch (e) {
      console.warn('[coach-context] calendar fetch skipped:', (e as Error).message);
    }
  }

  // ── 4. Entity-pinned lookups (optional) ──────────────────────────────────
  // If the caller passes specific entity IDs (e.g. the release the artist has
  // open in the UI), fetch those records directly and prepend them.
  if (entityIds.length > 0 && charBudget > 100) {
    try {
      const { data: pinned } = await sb
        .from('releases')
        .select('title, status, notes, release_date')
        .eq('user_id', uid)
        .in('id', entityIds.slice(0, 3)); // hard cap on IDs

      if (pinned && pinned.length > 0) {
        const lines = pinned.map((r) =>
          `- ${r.title} (${r.status}, ${r.release_date ?? 'no date'})${r.notes ? ': ' + String(r.notes).slice(0, 100) : ''}`,
        );
        const block = `PINNED RELEASES:\n${lines.join('\n')}\n\n`;
        sections.unshift(block.slice(0, 400)); // prepend — highest signal
        sources.unshift('pinned_releases');
      }
    } catch (e) {
      console.warn('[coach-context] entity pinning skipped:', (e as Error).message);
    }
  }

  // ── 5. Enforce hard total cap ─────────────────────────────────────────────
  let context = sections.join('');
  if (context.length > BUDGET_TOTAL_CHARS) {
    context = context.slice(0, BUDGET_TOTAL_CHARS) + '\n[context trimmed — token budget reached]';
  }

  return { context, sources: [...new Set(sources)] };
}

// ── Handler ───────────────────────────────────────────────────────────────────

const handler: Handler = async (event) => {
  // Ensure event has a type
  const typedEvent = event as { body: string };
  try {
    const body = JSON.parse(typedEvent.body);
  } catch (error) {
    console.error('Error parsing event body:', error);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid request body' }),
    };
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  const authHeader = event.headers['authorization'] ?? event.headers['Authorization'] ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return { statusCode: 401, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Missing Authorization header' }) };
  }
  const token = authHeader.slice(7);

  if (!SUPABASE_URL || !SUPABASE_ANON) {
    console.error('[coach-context] Missing SUPABASE env vars');
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Context service not configured' }) };
  }

  // ── Input ─────────────────────────────────────────────────────────────────
  let body: { question?: unknown; page?: unknown; entityIds?: unknown };
  try {
    body = JSON.parse(event.body ?? '{}');
  } catch {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const question  = typeof body.question === 'string'   ? body.question.trim().slice(0, 500) : '';
  const page      = typeof body.page     === 'string'   ? body.page.trim().slice(0, 60)      : '';
  const entityIds = Array.isArray(body.entityIds)
    ? (body.entityIds as unknown[]).filter((id): id is string => typeof id === 'string').slice(0, 5)
    : [];

  if (question.length < 2) {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'question must be at least 2 characters' }) };
  }

  // ── Supabase client scoped to the caller's JWT ────────────────────────────
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });

  const { data: { user }, error: authErr } = await sb.auth.getUser(token);
  if (authErr || !user) {
    return { statusCode: 401, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Invalid or expired token' }) };
  }

  // ── Build context ─────────────────────────────────────────────────────────
  const t0 = Date.now();
  let result: ContextResult;
  try {
    result = await buildContext(sb, user.id, question, page, entityIds);
  } catch (err) {
    console.error('[coach-context] build error:', (err as Error).message);
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Context retrieval failed' }) };
  }

  // ── Log types used (never log content) ───────────────────────────────────
  console.log(
    `[coach-context] uid=${user.id.slice(0, 8)}… page="${page}" ` +
    `sources=[${result.sources.join(',')}] chars=${result.context.length} ms=${Date.now() - t0}`,
  );

  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({ context: result.context, sources: result.sources }),
  };
};

export { handler };
export { buildContext };
export type { ContextResult };
