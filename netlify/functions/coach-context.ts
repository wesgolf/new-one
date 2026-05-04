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
  const normalizedQuestion = question.toLowerCase();
  const questionTerms = normalizedQuestion.split(/\s+/).filter(Boolean).slice(0, 6);
  const compactText = (value: unknown, maxLength = BUDGET_SNIPPET_CHARS) => {
    const text = String(value ?? '').replace(/\s+/g, ' ').trim();
    return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
  };
  const matchesQuestion = (...values: unknown[]) => {
    const haystack = values.map((value) => String(value ?? '').toLowerCase()).join(' ');
    if (!haystack) return false;
    if (haystack.includes(normalizedQuestion)) return true;
    return questionTerms.some((term) => haystack.includes(term));
  };

  try {
    const [profileRes, ideasRes, goalsRes, tasksRes, reportsRes] = await Promise.all([
      sb.from('profiles').select('full_name, email, role').eq('id', uid).single(),
      sb.from('ideas').select('title, status, next_action, bpm, key, notes, updated_at').eq('user_id', uid).order('updated_at', { ascending: false }).limit(6),
      sb.from('goals').select('title, description, status_indicator, due_by, current, target').eq('user_id', uid).order('updated_at', { ascending: false }).limit(5),
      sb.from('tasks').select('title, description, completed, due_date').or(`user_id_assigned_by.eq.${uid},user_id_assigned_to.eq.${uid}`).order('updated_at', { ascending: false }).limit(5),
      sb.from('reports').select('title, report_date, report_content').eq('user_id', uid).order('report_date', { ascending: false }).limit(3),
    ]);

    const profile = profileRes.data;
    let block = `ARTIST PROFILE:\n- Name: ${profile?.full_name ?? profile?.email ?? 'the artist'}\n- Email: ${profile?.email ?? ''}\n- Role: ${profile?.role ?? 'artist'}\n`;

    if ((ideasRes.data ?? []).length > 0) {
      block += `\nRECENT IDEAS:\n`;
      for (const idea of ideasRes.data ?? []) {
        const meta = [idea.status, idea.next_action, idea.bpm ? `${idea.bpm} BPM` : null, idea.key].filter(Boolean).join(', ');
        block += `- ${idea.title}${meta ? ` (${meta})` : ''}${idea.notes ? `: ${compactText(idea.notes, 80)}` : ''}\n`;
      }
    }

    if ((goalsRes.data ?? []).length > 0) {
      block += `\nACTIVE GOALS:\n`;
      for (const goal of goalsRes.data ?? []) {
        const meta = [goal.status_indicator, goal.due_by ? `due ${goal.due_by}` : null, goal.target ? `${goal.current ?? 0}/${goal.target}` : null].filter(Boolean).join(', ');
        block += `- ${goal.title}${goal.description ? `: ${compactText(goal.description, 80)}` : ''}${meta ? ` (${meta})` : ''}\n`;
      }
    }

    if ((tasksRes.data ?? []).length > 0) {
      block += `\nRECENT TASKS:\n`;
      for (const task of tasksRes.data ?? []) {
        block += `- ${task.title} (${task.completed ?? 'pending'}${task.due_date ? `, due ${task.due_date}` : ''})${task.description ? `: ${compactText(task.description, 80)}` : ''}\n`;
      }
    }

    if ((reportsRes.data ?? []).length > 0) {
      block += `\nLATEST REPORTS:\n`;
      for (const report of reportsRes.data ?? []) {
        block += `- ${report.title}${report.report_date ? ` (${report.report_date})` : ''}${report.report_content ? `: ${compactText(report.report_content, 80)}` : ''}\n`;
      }
    }

    sections.push(block.slice(0, 900));
    charBudget -= Math.min(block.length, 900);
    sources.push('profile');
  } catch (e) {
    console.warn('[coach-context] profile summary skipped:', (e as Error).message);
  }

  if (charBudget > 100) {
    try {
      const [ideaMatchesRes, goalMatchesRes, taskMatchesRes, resourceMatchesRes] = await Promise.all([
        sb.from('ideas').select('title, status, next_action, notes').eq('user_id', uid).order('updated_at', { ascending: false }).limit(12),
        sb.from('goals').select('title, description, status_indicator, due_by').eq('user_id', uid).order('updated_at', { ascending: false }).limit(10),
        sb.from('tasks').select('title, description, completed, due_date').or(`user_id_assigned_by.eq.${uid},user_id_assigned_to.eq.${uid}`).order('updated_at', { ascending: false }).limit(12),
        sb.from('bot_resources').select('title, category, content_excerpt, content').eq('user_id', uid).order('updated_at', { ascending: false }).limit(8),
      ]);

      const grouped: Record<string, string[]> = {};
      const appendMatch = (type: string, title: unknown, snippet: unknown) => {
        const safeTitle = String(title ?? '').trim();
        if (!safeTitle) return;
        grouped[type] = grouped[type] ?? [];
        grouped[type].push(compactText(snippet) ? `- ${safeTitle}: ${compactText(snippet)}` : `- ${safeTitle}`);
      };

      for (const idea of ideaMatchesRes.data ?? []) {
        if (matchesQuestion(idea.title, idea.notes, idea.status, idea.next_action)) {
          appendMatch('idea', idea.title, [idea.status, idea.next_action, idea.notes].filter(Boolean).join(' · '));
        }
      }

      for (const goal of goalMatchesRes.data ?? []) {
        if (matchesQuestion(goal.title, goal.description, goal.status_indicator, goal.due_by)) {
          appendMatch('goal', goal.title, [goal.status_indicator, goal.due_by, goal.description].filter(Boolean).join(' · '));
        }
      }

      for (const task of taskMatchesRes.data ?? []) {
        if (matchesQuestion(task.title, task.description, task.completed, task.due_date)) {
          appendMatch('task', task.title, [task.completed, task.due_date, task.description].filter(Boolean).join(' · '));
        }
      }

      for (const resource of resourceMatchesRes.data ?? []) {
        if (matchesQuestion(resource.title, resource.category, resource.content_excerpt, resource.content)) {
          appendMatch('resource', resource.title ?? resource.category ?? 'Knowledge resource', [resource.category, resource.content_excerpt ?? resource.content].filter(Boolean).join(' · '));
        }
      }

      if (Object.keys(grouped).length > 0) {
        let block = '';
        for (const [type, items] of Object.entries(grouped)) {
          block += `${type.toUpperCase()}S:\n${items.slice(0, 3).join('\n')}\n\n`;
          sources.push(type);
        }

        const allowedChars = Math.min(BUDGET_TOTAL_CHARS - BUDGET_ANALYTICS_CHARS - BUDGET_CALENDAR_CHARS, charBudget);
        sections.push(block.slice(0, allowedChars));
        charBudget -= Math.min(block.length, allowedChars);
      }
    } catch (e) {
      console.warn('[coach-context] relevance scan skipped:', (e as Error).message);
    }
  }

  if (charBudget > 100) {
    try {
      const { data: reports } = await sb
        .from('reports')
        .select('title, report_date, report_content')
        .eq('user_id', uid)
        .order('report_date', { ascending: false })
        .limit(2);

      if (reports && reports.length > 0) {
        const lines = reports.map((report) => `- ${report.title}${report.report_date ? ` (${report.report_date})` : ''}${report.report_content ? `: ${compactText(report.report_content, 120)}` : ''}`);
        const block = `REPORT SUMMARIES:\n${lines.join('\n')}\n\n`;
        sections.push(block.slice(0, BUDGET_ANALYTICS_CHARS));
        charBudget -= Math.min(block.length, BUDGET_ANALYTICS_CHARS);
        sources.push('reports');
      }
    } catch (e) {
      console.warn('[coach-context] reports fetch skipped:', (e as Error).message);
    }
  }

  if (charBudget > 100) {
    try {
      const { data: upcoming } = await sb
        .from('calendar_events')
        .select('title, event_type, starts_at, ends_at, description')
        .eq('user_id', uid)
        .gte('starts_at', new Date().toISOString())
        .order('starts_at', { ascending: true })
        .limit(5);

      const calLines = (upcoming ?? []).map((event) =>
        `- ${event.title} (${event.event_type}, ${event.starts_at})${event.description ? `: ${compactText(event.description, 60)}` : ''}`,
      );

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

  if (entityIds.length > 0 && charBudget > 100) {
    try {
      const safeIds = entityIds.slice(0, 3);
      const [pinnedIdeasRes, pinnedGoalsRes, pinnedTasksRes] = await Promise.all([
        sb.from('ideas').select('title, status, next_action, notes').eq('user_id', uid).in('id', safeIds),
        sb.from('goals').select('title, status_indicator, due_by, description').eq('user_id', uid).in('id', safeIds),
        sb.from('tasks').select('title, completed, due_date, description').or(`user_id_assigned_by.eq.${uid},user_id_assigned_to.eq.${uid}`).in('id', safeIds),
      ]);

      const lines = [
        ...(pinnedIdeasRes.data ?? []).map((idea) => `- Idea: ${idea.title}${idea.status ? ` (${idea.status})` : ''}${idea.next_action ? ` · ${idea.next_action}` : ''}${idea.notes ? `: ${compactText(idea.notes, 80)}` : ''}`),
        ...(pinnedGoalsRes.data ?? []).map((goal) => `- Goal: ${goal.title}${goal.status_indicator ? ` (${goal.status_indicator})` : ''}${goal.due_by ? ` · due ${goal.due_by}` : ''}${goal.description ? `: ${compactText(goal.description, 80)}` : ''}`),
        ...(pinnedTasksRes.data ?? []).map((task) => `- Task: ${task.title}${task.completed ? ` (${task.completed})` : ''}${task.due_date ? ` · due ${task.due_date}` : ''}${task.description ? `: ${compactText(task.description, 80)}` : ''}`),
      ];

      if (lines.length > 0) {
        sections.unshift(`PINNED RECORDS:\n${lines.join('\n')}\n\n`);
        sources.unshift('pinned_records');
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
