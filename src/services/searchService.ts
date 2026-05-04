import { supabase } from '../lib/supabase';

export type SearchRecordType =
  | 'idea'
  | 'goal'
  | 'task'
  | 'event'
  | 'report'
  | 'resource'
  | 'note'
  | 'release'
  | 'content'
  | 'opportunity';

export interface SearchResult {
  id: string;
  record_type: SearchRecordType;
  title: string;
  snippet: string;
  rank: number;
}

type SearchCandidate = {
  id: string;
  record_type: SearchRecordType;
  title: string;
  snippet: string;
  rank: number;
};

function escapeLike(value: string) {
  return value.replace(/[%_]/g, ' ').trim();
}

function normalize(value: unknown) {
  return String(value ?? '').toLowerCase();
}

function compactSnippet(value: unknown, maxLength = 150) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function rankCandidate(query: string, title: unknown, snippet: unknown) {
  const normalizedQuery = normalize(query);
  const normalizedTitle = normalize(title);
  const normalizedSnippet = normalize(snippet);
  let rank = 0;

  if (normalizedTitle === normalizedQuery) rank += 120;
  if (normalizedTitle.startsWith(normalizedQuery)) rank += 80;
  if (normalizedTitle.includes(normalizedQuery)) rank += 50;
  if (normalizedSnippet.includes(normalizedQuery)) rank += 20;

  for (const term of normalizedQuery.split(/\s+/).filter(Boolean)) {
    if (normalizedTitle.includes(term)) rank += 12;
    if (normalizedSnippet.includes(term)) rank += 4;
  }

  return rank;
}

function taskBelongsToUser(task: { user_id_assigned_by?: string | null; user_id_assigned_to?: string | null }, userId: string) {
  return task.user_id_assigned_by === userId || task.user_id_assigned_to === userId;
}

function pushCandidate(
  target: SearchCandidate[],
  query: string,
  recordType: SearchRecordType,
  row: {
    id: string;
    title?: string | null;
    snippet?: string | null;
  },
) {
  const title = String(row.title ?? '').trim();
  const snippet = compactSnippet(row.snippet);
  const rank = rankCandidate(query, title, snippet);
  if (!title || rank <= 0) return;
  target.push({
    id: row.id,
    record_type: recordType,
    title,
    snippet,
    rank,
  });
}

export async function searchRecords(query: string): Promise<SearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return [];

  const likePattern = `%${escapeLike(trimmed)}%`;

  const [ideasRes, goalsRes, tasksRes, reportsRes, resourcesRes, eventsRes] = await Promise.allSettled([
    supabase
      .from('ideas')
      .select('id,title,notes,status,next_action,updated_at')
      .eq('user_id', userId)
      .or(`title.ilike.${likePattern},notes.ilike.${likePattern},status.ilike.${likePattern},next_action.ilike.${likePattern}`)
      .order('updated_at', { ascending: false })
      .limit(10),
    supabase
      .from('goals')
      .select('id,title,description,status_indicator,due_by,updated_at')
      .eq('user_id', userId)
      .or(`title.ilike.${likePattern},description.ilike.${likePattern},status_indicator.ilike.${likePattern}`)
      .order('updated_at', { ascending: false })
      .limit(10),
    supabase
      .from('tasks')
      .select('id,title,description,completed,due_date,updated_at,user_id_assigned_by,user_id_assigned_to')
      .or(`user_id_assigned_by.eq.${userId},user_id_assigned_to.eq.${userId}`)
      .order('updated_at', { ascending: false })
      .limit(25),
    supabase
      .from('reports')
      .select('id,title,report_content,report_date')
      .eq('user_id', userId)
      .or(`title.ilike.${likePattern},report_content.ilike.${likePattern}`)
      .order('report_date', { ascending: false })
      .limit(8),
    supabase
      .from('bot_resources')
      .select('id,title,content,content_excerpt,category,updated_at')
      .eq('user_id', userId)
      .or(`title.ilike.${likePattern},content.ilike.${likePattern},content_excerpt.ilike.${likePattern},category.ilike.${likePattern}`)
      .order('updated_at', { ascending: false })
      .limit(10),
    supabase
      .from('calendar_events')
      .select('id,title,description,event_type,starts_at')
      .eq('user_id', userId)
      .or(`title.ilike.${likePattern},description.ilike.${likePattern},event_type.ilike.${likePattern}`)
      .order('starts_at', { ascending: true })
      .limit(10),
  ]);

  const candidates: SearchCandidate[] = [];

  if (ideasRes.status === 'fulfilled' && !ideasRes.value.error) {
    for (const idea of ideasRes.value.data ?? []) {
      pushCandidate(candidates, trimmed, 'idea', {
        id: idea.id,
        title: idea.title,
        snippet: [idea.status, idea.next_action, idea.notes].filter(Boolean).join(' · '),
      });
    }
  }

  if (goalsRes.status === 'fulfilled' && !goalsRes.value.error) {
    for (const goal of goalsRes.value.data ?? []) {
      pushCandidate(candidates, trimmed, 'goal', {
        id: goal.id,
        title: goal.title,
        snippet: [goal.status_indicator, goal.due_by, goal.description].filter(Boolean).join(' · '),
      });
    }
  }

  if (tasksRes.status === 'fulfilled' && !tasksRes.value.error) {
    for (const task of tasksRes.value.data ?? []) {
      if (!taskBelongsToUser(task, userId)) continue;
      pushCandidate(candidates, trimmed, 'task', {
        id: task.id,
        title: task.title,
        snippet: [task.completed, task.due_date, task.description].filter(Boolean).join(' · '),
      });
    }
  }

  if (reportsRes.status === 'fulfilled' && !reportsRes.value.error) {
    for (const report of reportsRes.value.data ?? []) {
      pushCandidate(candidates, trimmed, 'report', {
        id: report.id,
        title: report.title,
        snippet: [report.report_date, report.report_content].filter(Boolean).join(' · '),
      });
    }
  }

  if (resourcesRes.status === 'fulfilled' && !resourcesRes.value.error) {
    for (const resource of resourcesRes.value.data ?? []) {
      pushCandidate(candidates, trimmed, 'resource', {
        id: resource.id,
        title: resource.title || resource.category || 'Knowledge resource',
        snippet: [resource.category, resource.content_excerpt || resource.content].filter(Boolean).join(' · '),
      });
    }
  }

  if (eventsRes.status === 'fulfilled' && !eventsRes.value.error) {
    for (const event of eventsRes.value.data ?? []) {
      pushCandidate(candidates, trimmed, 'event', {
        id: event.id,
        title: event.title,
        snippet: [event.event_type, event.starts_at, event.description].filter(Boolean).join(' · '),
      });
    }
  }

  return candidates
    .sort((a, b) => b.rank - a.rank)
    .slice(0, 20);
}

export async function getAgentContext(query: string): Promise<string> {
  const results = await searchRecords(query);
  if (results.length === 0) return '';

  return results
    .map((result) => `[${result.record_type}] ${result.title}${result.snippet ? ` — ${result.snippet}` : ''}`)
    .join('\n');
}
