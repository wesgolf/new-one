import { supabase } from './supabase';
import { getCurrentAuthUser } from './auth';
import type {
  GoalRecord,
  IdeaAsset,
  IdeaComment,
  IdeaRecord,
  ProfileSummary,
  ReleaseRecord,
  TaskRecord,
} from '../types/domain';

function notSupported(name: string): Error {
  return new Error(`${name} is not available in the current schema phase.`);
}

function mapTaskStatus(value: string | null | undefined): TaskRecord['status'] {
  if (value === 'completed') return 'completed';
  if (value === 'cancelled') return 'cancelled';
  return 'pending';
}

function mapTaskRow(row: any): TaskRecord {
  const status = mapTaskStatus(row.completed);
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? null,
    status,
    priority: row.priority ?? 'medium',
    user_id_assigned_by: row.user_id_assigned_by ?? null,
    user_id_assigned_to: row.user_id_assigned_to ?? null,
    assigned_to: row.user_id_assigned_to ?? null,
    created_by: row.user_id_assigned_by ?? null,
    due_date: row.due_date ?? null,
    completed_at: row.completed_at ?? null,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
  };
}

function normalizeIdeaAssets(value: unknown, ideaId: string): IdeaAsset[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((asset, index) => {
      if (!asset || typeof asset !== 'object') return null;
      const raw = asset as Record<string, any>;
      return {
        id: String(raw.id ?? `${ideaId}-asset-${index}`),
        idea_id: ideaId,
        file_url: String(raw.file_url ?? raw.url ?? ''),
        file_path: raw.file_path ?? raw.path ?? null,
        asset_type: raw.asset_type ?? raw.file_type ?? 'audio',
        metadata: raw.metadata ?? {
          version: raw.version ?? null,
          file_type: raw.file_type ?? null,
          label: raw.label ?? null,
        },
        created_at: raw.created_at ?? null,
      } as IdeaAsset;
    })
    .filter((asset): asset is IdeaAsset => Boolean(asset?.file_url));
}

function normalizeIdeaComments(value: unknown, ideaId: string): IdeaComment[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((comment, index) => {
      if (!comment || typeof comment !== 'object') return null;
      const raw = comment as Record<string, any>;
      return {
        id: String(raw.id ?? `${ideaId}-comment-${index}`),
        idea_id: ideaId,
        author_id: raw.author_id ?? raw.contributor_id ?? null,
        author_name: raw.author_name ?? raw.contributor_name ?? null,
        body: String(raw.body ?? raw.comment ?? ''),
        timestamp_seconds: raw.timestamp_seconds ?? null,
        created_at: raw.created_at ?? raw.timestamp ?? null,
        avatar_url: raw.avatar_url ?? null,
      } as IdeaComment;
    })
    .filter((comment): comment is IdeaComment => Boolean(comment?.body));
}

function mapIdeaRow(row: any): IdeaRecord {
  return {
    id: row.id,
    user_id: row.user_id ?? null,
    title: row.title,
    description: row.notes ?? null,
    notes: row.notes ?? null,
    status: row.status ?? 'demo',
    bpm: row.bpm ?? null,
    key_sig: row.key ?? null,
    musical_key: row.key ?? null,
    version_numbers: row.version_numbers ?? 1,
    collaborators: Array.isArray(row.collaborators) ? row.collaborators : [],
    is_collab: Boolean(row.is_collab),
    file_urls: Array.isArray(row.file_urls) ? row.file_urls : [],
    idea_comments: Array.isArray(row.idea_comments) ? row.idea_comments : [],
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
    share_slug: row.id,
    is_public: Boolean(row.is_collab),
  };
}

function mapGoalRow(row: any): GoalRecord {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? null,
    category: row.category ?? null,
    goal_type: row.goal_type ?? 'count',
    tracking_mode: row.tracking_mode ?? 'manual',
    target: Number(row.target ?? 0),
    current: Number(row.current ?? 0),
    target_value: Number(row.target ?? 0),
    current_value: Number(row.current ?? 0),
    term: row.term ?? 'short',
    priority: row.priority ?? 'medium',
    is_recurring: Boolean(row.is_recurring),
    recurrence_pattern: row.recurrence_pattern ?? null,
    recurrence_interval: row.recurrence_interval ?? null,
    status_indicator: row.status_indicator ?? null,
    due_by: row.due_by ?? null,
    deadline: row.due_by ?? null,
    source_metric: row.metric_source ?? null,
    metric_source: row.metric_source ?? null,
    metric_key: row.metric_key ?? null,
    formula: row.formula ?? null,
    is_timeless: Boolean(row.is_timeless),
    ai_analysis: row.ai_analysis ?? null,
    ai_analysis_run: row.ai_analysis_run ?? null,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
  };
}

export async function safeProfiles(): Promise<ProfileSummary[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id,full_name,role,email,phone_number')
    .order('full_name', { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: row.id,
    full_name: row.full_name ?? null,
    role: row.role ?? null,
    email: row.email ?? null,
    phone_number: row.phone_number ?? null,
  }));
}

export async function fetchTasks(): Promise<TaskRecord[]> {
  const user = await getCurrentAuthUser();
  let query = supabase.from('tasks').select('*').order('created_at', { ascending: false });

  if (user?.id) {
    query = query.or(`user_id_assigned_by.eq.${user.id},user_id_assigned_to.eq.${user.id}`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapTaskRow);
}

export async function fetchMyTasks(userId: string): Promise<TaskRecord[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id_assigned_to', userId)
    .order('due_date', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(mapTaskRow);
}

export async function saveTask(task: Partial<TaskRecord>) {
  const user = await getCurrentAuthUser();
  const payload: Record<string, any> = {
    title: task.title ?? '',
    description: task.description ?? null,
    priority: task.priority ?? 'medium',
    completed: task.status ?? 'pending',
    due_date: task.due_date ? String(task.due_date).slice(0, 10) : null,
    completed_at: task.status === 'completed' ? (task.completed_at ?? new Date().toISOString()) : null,
    user_id_assigned_by: task.user_id_assigned_by ?? task.created_by ?? user?.id ?? null,
    user_id_assigned_to: task.user_id_assigned_to ?? task.assigned_to ?? user?.id ?? null,
    updated_at: new Date().toISOString(),
  };

  if (task.id) {
    const { data, error } = await supabase
      .from('tasks')
      .update(payload)
      .eq('id', task.id)
      .select()
      .single();
    if (error) throw error;
    return mapTaskRow(data);
  }

  const { data, error } = await supabase.from('tasks').insert([payload]).select().single();
  if (error) throw error;
  return mapTaskRow(data);
}

export async function fetchIdeas(): Promise<IdeaRecord[]> {
  const user = await getCurrentAuthUser();
  let query = supabase.from('ideas').select('*').order('updated_at', { ascending: false });
  if (user?.id) query = query.eq('user_id', user.id);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapIdeaRow);
}

export async function fetchIdeaAssets(ideaId: string): Promise<IdeaAsset[]> {
  const { data, error } = await supabase
    .from('ideas')
    .select('id,file_urls')
    .eq('id', ideaId)
    .maybeSingle();

  if (error) throw error;
  return normalizeIdeaAssets(data?.file_urls, ideaId);
}

export async function fetchIdeaComments(ideaId: string): Promise<IdeaComment[]> {
  const { data, error } = await supabase
    .from('ideas')
    .select('id,idea_comments')
    .eq('id', ideaId)
    .maybeSingle();

  if (error) throw error;
  return normalizeIdeaComments(data?.idea_comments, ideaId);
}

export async function saveIdea(idea: Partial<IdeaRecord>) {
  const user = await getCurrentAuthUser();
  const payload: Record<string, any> = {
    user_id: idea.user_id ?? user?.id ?? null,
    title: idea.title ?? '',
    status: idea.status ?? 'demo',
    bpm: idea.bpm ?? null,
    key: idea.musical_key ?? idea.key_sig ?? null,
    notes: idea.notes ?? idea.description ?? null,
    version_numbers: idea.version_numbers ?? 1,
    collaborators: Array.isArray(idea.collaborators) ? idea.collaborators : [],
    idea_comments: Array.isArray(idea.idea_comments) ? idea.idea_comments : [],
    is_collab: Boolean(idea.is_collab),
    file_urls: Array.isArray(idea.file_urls) ? idea.file_urls : [],
    updated_at: new Date().toISOString(),
  };

  if (idea.id) {
    const { data, error } = await supabase
      .from('ideas')
      .update(payload)
      .eq('id', idea.id)
      .select()
      .single();
    if (error) throw error;
    return mapIdeaRow(data);
  }

  const { data, error } = await supabase.from('ideas').insert([payload]).select().single();
  if (error) throw error;
  return mapIdeaRow(data);
}

export async function saveIdeaComment(comment: Partial<IdeaComment>) {
  if (!comment.idea_id) throw new Error('idea_id is required');

  const user = await getCurrentAuthUser();
  const { data: idea, error: fetchError } = await supabase
    .from('ideas')
    .select('idea_comments')
    .eq('id', comment.idea_id)
    .maybeSingle();

  if (fetchError) throw fetchError;

  const nextComment = {
    id: comment.id ?? crypto.randomUUID(),
    body: comment.body ?? '',
    author_id: comment.author_id ?? user?.id ?? null,
    author_name: comment.author_name ?? null,
    timestamp_seconds: comment.timestamp_seconds ?? null,
    created_at: comment.created_at ?? new Date().toISOString(),
  };

  const existing = Array.isArray(idea?.idea_comments) ? idea.idea_comments : [];
  const next = [nextComment, ...existing];

  const { error } = await supabase
    .from('ideas')
    .update({ idea_comments: next, updated_at: new Date().toISOString() })
    .eq('id', comment.idea_id);

  if (error) throw error;
  return nextComment as IdeaComment;
}

export async function updateIdeaCommentTimestamp(id: string, timestampSeconds: number | null): Promise<void> {
  const user = await getCurrentAuthUser();
  if (!user?.id) throw new Error('Authentication required');

  const { data: ideas, error: fetchError } = await supabase
    .from('ideas')
    .select('id,idea_comments')
    .eq('user_id', user.id);

  if (fetchError) throw fetchError;

  for (const idea of ideas ?? []) {
    const comments = normalizeIdeaComments(idea.idea_comments, idea.id);
    const index = comments.findIndex((comment) => comment.id === id);
    if (index === -1) continue;

    const next = comments.map((comment) =>
      comment.id === id ? { ...comment, timestamp_seconds: timestampSeconds } : comment,
    );

    const { error } = await supabase
      .from('ideas')
      .update({ idea_comments: next, updated_at: new Date().toISOString() })
      .eq('id', idea.id);

    if (error) throw error;
    return;
  }
}

export async function uploadIdeaAudio(file: File, ideaId: string, extraMeta: Record<string, unknown> = {}) {
  const user = await getCurrentAuthUser();
  const ext = file.name.split('.').pop() || 'mp3';
  const path = `${user?.id || 'public'}/${ideaId}/${Date.now()}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from('idea-assets')
    .upload(path, file, { upsert: false });
  if (uploadError) throw uploadError;

  const { data: publicData } = supabase.storage.from('idea-assets').getPublicUrl(path);
  return saveIdeaAsset({
    idea_id: ideaId,
    file_url: publicData.publicUrl,
    file_path: path,
    asset_type: 'audio',
    metadata: {
      name: file.name,
      size: file.size,
      mime_type: file.type,
      ...extraMeta,
    },
  });
}

export async function saveIdeaAsset(asset: Partial<IdeaAsset>) {
  if (!asset.idea_id) throw new Error('idea_id is required');

  const { data: idea, error: fetchError } = await supabase
    .from('ideas')
    .select('file_urls')
    .eq('id', asset.idea_id)
    .maybeSingle();

  if (fetchError) throw fetchError;

  const nextAsset = {
    id: asset.id ?? crypto.randomUUID(),
    file_url: asset.file_url ?? '',
    file_path: asset.file_path ?? null,
    asset_type: asset.asset_type ?? 'audio',
    metadata: asset.metadata ?? null,
    created_at: asset.created_at ?? new Date().toISOString(),
  };

  const existing = Array.isArray(idea?.file_urls) ? idea.file_urls : [];
  const next = [...existing, nextAsset];

  const { error } = await supabase
    .from('ideas')
    .update({ file_urls: next, updated_at: new Date().toISOString() })
    .eq('id', asset.idea_id);

  if (error) throw error;
  return nextAsset as IdeaAsset;
}

export async function deleteIdea(id: string) {
  const { error } = await supabase.from('ideas').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchGoals(): Promise<GoalRecord[]> {
  const user = await getCurrentAuthUser();
  let query = supabase.from('goals').select('*').order('created_at', { ascending: false });
  if (user?.id) query = query.eq('user_id', user.id);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapGoalRow);
}

export async function fetchGoalEntries() {
  return [];
}

export async function saveGoal(goal: Partial<GoalRecord>) {
  const user = await getCurrentAuthUser();
  const payload: Record<string, any> = {
    user_id: goal.user_id ?? user?.id ?? null,
    title: goal.title ?? '',
    due_by: goal.due_by ?? goal.deadline ?? null,
    category: goal.category ?? null,
    is_recurring: Boolean(goal.is_recurring),
    priority: goal.priority ?? 'medium',
    target: Number(goal.target_value ?? goal.target ?? 0),
    current: Number(goal.current_value ?? goal.current ?? 0),
    term: goal.term ?? 'short',
    recurrence_pattern: goal.recurrence_pattern ?? null,
    recurrence_interval: goal.recurrence_interval ?? null,
    status_indicator: goal.status_indicator ?? null,
    description: goal.description ?? null,
    goal_type: goal.goal_type ?? 'count',
    tracking_mode: goal.tracking_mode ?? 'manual',
    metric_source: goal.metric_source ?? goal.source_metric ?? null,
    metric_key: goal.metric_key ?? null,
    formula: goal.formula ?? null,
    is_timeless: Boolean(goal.is_timeless),
    ai_analysis: goal.ai_analysis ?? null,
    ai_analysis_run: goal.ai_analysis_run ?? null,
    updated_at: new Date().toISOString(),
  };

  if (goal.id) {
    const { data, error } = await supabase
      .from('goals')
      .update(payload)
      .eq('id', goal.id)
      .select()
      .single();
    if (error) throw error;
    return mapGoalRow(data);
  }

  const { data, error } = await supabase.from('goals').insert([payload]).select().single();
  if (error) throw error;
  return mapGoalRow(data);
}

export async function saveGoalEntry() {
  throw notSupported('Goal progress entries');
}

export async function fetchIntegrations() {
  const { data, error } = await supabase
    .from('integrations')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchSyncJobs() {
  return [];
}

export async function fetchReleases(): Promise<ReleaseRecord[]> {
  return [];
}

export async function fetchReleaseList(): Promise<ReleaseRecord[]> {
  return [];
}

export async function fetchPublicHubReleases(): Promise<ReleaseRecord[]> {
  return [];
}

export async function fetchReleaseById() {
  return null;
}

export async function uploadReleaseArtwork() {
  throw notSupported('Release artwork uploads');
}

export async function saveRelease() {
  throw notSupported('Releases');
}

export async function deleteRelease() {
  throw notSupported('Releases');
}
