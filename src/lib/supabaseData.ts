import { supabase } from './supabase';
import { getCurrentAuthUser, getCurrentUserWithProfile } from './auth';
import type {
  GoalEntry,
  GoalRecord,
  IdeaAsset,
  IdeaComment,
  IdeaRecord,
  IntegrationAccount,
  ProfileSummary,
  ReleaseRecord,
  SyncJob,
  TaskRecord,
} from '../types/domain';

export function isMissingTableError(error: any) {
  return Boolean(
    error &&
      (
        error.code === '42P01' ||
        String(error.message || '').includes('Could not find the table') ||
        String(error.message || '').includes('relation') && String(error.message || '').includes('does not exist')
      )
  );
}

export async function safeSelect<T = any>(
  table: string,
  orderBy = 'created_at',
  ascending = false
): Promise<T[]> {
  const query = supabase.from(table).select('*');
  const { data, error } = await query.order(orderBy, { ascending });
  if (error) {
    if (isMissingTableError(error)) return [];
    throw error;
  }
  return (data || []) as T[];
}

export async function safeProfiles(): Promise<ProfileSummary[]> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, role, email')
      .order('full_name', { ascending: true });

    if (error) {
      if (isMissingTableError(error)) return [];
      throw error;
    }

    return (data || []) as ProfileSummary[];
  } catch {
    return [];
  }
}

export async function fetchTasks(): Promise<TaskRecord[]> {
  try {
    const rows = await safeSelect<TaskRecord>('tasks', 'updated_at', false);
    if (rows.length > 0) return rows;
  } catch {}

  const legacyTodos = await safeSelect<any>('todos', 'created_at', false);
  return legacyTodos.map((todo) => ({
    id: todo.id,
    title: todo.task,
    description: todo.notes ?? null,
    status: todo.completed ? 'done' : 'todo',
    priority: todo.priority || 'medium',
    assigned_to: todo.user_id ?? null,
    created_by: todo.user_id ?? null,
    due_date: todo.due_date ?? null,
    completed_at: todo.completed ? todo.updated_at || todo.created_at : null,
    related_type: todo.linked_entity_type ?? null,
    related_id: todo.linked_entity_id ?? null,
    created_at: todo.created_at,
    updated_at: todo.updated_at ?? todo.created_at,
  }));
}

/** Fetch active (non-done) tasks assigned to a specific user, ordered by due date. */
export async function fetchMyTasks(userId: string): Promise<TaskRecord[]> {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('assigned_to', userId)
      .order('due_date', { ascending: true });
    if (error) {
      if (isMissingTableError(error)) return [];
      throw error;
    }
    return (data || []) as TaskRecord[];
  } catch {
    return [];
  }
}

export async function saveTask(task: Partial<TaskRecord>) {
  const user = await getCurrentAuthUser();
  const payload = {
    ...task,
    created_by: task.created_by || user?.id || null,
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
    return data as TaskRecord;
  }

  const { data, error } = await supabase.from('tasks').insert([payload]).select().single();
  if (error) throw error;
  return data as TaskRecord;
}

export async function fetchIdeas(): Promise<IdeaRecord[]> {
  try {
    const rows = await safeSelect<IdeaRecord>('ideas', 'updated_at', false);
    if (rows.length > 0) return rows;
  } catch {}

  const legacyReleases = await safeSelect<any>('releases', 'created_at', false);
  return legacyReleases
    .filter((release) => ['idea', 'production', 'mastered', 'ready'].includes(release.status))
    .map((release) => ({
      id: release.id,
      title: release.title,
      description: release.rationale || release.notes || null,
      status: release.status,
      is_collab: Boolean(release.is_public),
      created_by: release.user_id ?? null,
      created_at: release.created_at,
      updated_at: release.updated_at ?? release.created_at,
      share_slug: release.id,
      is_public: Boolean(release.is_public),
    }));
}

export async function fetchIdeaAssets(ideaId: string): Promise<IdeaAsset[]> {
  try {
    const { data, error } = await supabase
      .from('idea_assets')
      .select('*')
      .eq('idea_id', ideaId)
      .order('created_at', { ascending: false });
    if (error) {
      if (isMissingTableError(error)) return [];
      throw error;
    }
    return (data || []) as IdeaAsset[];
  } catch {
    return [];
  }
}

export async function fetchIdeaComments(ideaId: string): Promise<IdeaComment[]> {
  try {
    const { data, error } = await supabase
      .from('idea_comments')
      .select('*')
      .eq('idea_id', ideaId)
      .order('created_at', { ascending: false });
    if (error) {
      if (isMissingTableError(error)) return [];
      throw error;
    }
    return (data || []) as IdeaComment[];
  } catch {
    return [];
  }
}

export async function saveIdea(idea: Partial<IdeaRecord>) {
  const user = await getCurrentAuthUser();
  const currentUser = await getCurrentUserWithProfile();
  if (!idea.id && currentUser?.profile?.role === 'manager') {
    throw new Error('Managers can review ideas but cannot create new tracks.');
  }
  // Explicit payload — only send columns that exist in the ideas table.
  // Avoids schema cache errors when the type has extra fields.
  const payload: Record<string, unknown> = {
    title: idea.title,
    description: idea.description ?? null,
    status: idea.status ?? 'demo',
    bpm: idea.bpm ?? null,
    key_sig: idea.key_sig ?? null,
    genre: idea.genre ?? null,
    mood: idea.mood ?? null,
    is_collab: idea.is_collab ?? false,
    is_public: idea.is_public ?? false,
    share_slug: idea.share_slug ?? null,
    artist_name: idea.artist_name ?? null,
    voice_memo_url: idea.voice_memo_url ?? null,
    user_id: idea.user_id || user?.id || null,
    updated_at: new Date().toISOString(),
  };
  if (idea.id) payload.id = idea.id;

  if (idea.id) {
    const { data, error } = await supabase
      .from('ideas')
      .update(payload)
      .eq('id', idea.id)
      .select()
      .single();
    if (error) throw error;
    return data as IdeaRecord;
  }

  const { data, error } = await supabase.from('ideas').insert([payload]).select().single();
  if (error) throw error;
  return data as IdeaRecord;
}

export async function saveIdeaComment(comment: Partial<IdeaComment>) {
  const user = await getCurrentAuthUser();
  const payload = {
    ...comment,
    author_id: comment.author_id || user?.id || null,
  };
  const { data, error } = await supabase.from('idea_comments').insert([payload]).select().single();
  if (error) throw error;
  return data as IdeaComment;
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
  const { data, error } = await supabase
    .from('idea_assets')
    .insert([
      {
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
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data as IdeaAsset;
}

export async function saveIdeaAsset(asset: Partial<IdeaAsset>) {
  const { data, error } = await supabase.from('idea_assets').insert([asset]).select().single();
  if (error) throw error;
  return data as IdeaAsset;
}

export async function deleteIdea(id: string) {
  const { error } = await supabase.from('ideas').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchGoals(): Promise<GoalRecord[]> {
  try {
    const rows = await safeSelect<any>('goals', 'updated_at', false);
    return rows.map((goal) => ({
      id: goal.id,
      title: goal.title,
      description: goal.description ?? null,
      goal_type: goal.goal_type ?? (goal.formula ? 'ratio' : 'count'),
      tracking_mode: goal.tracking_mode ?? (goal.manual_progress ? 'manual' : 'automatic'),
      target_value: goal.target_value ?? goal.target ?? null,
      current_value: goal.current_value ?? goal.current ?? null,
      source_metric: goal.source_metric ?? null,
      formula: goal.formula ?? null,
      unit: goal.unit ?? null,
      start_date: goal.start_date ?? null,
      end_date: goal.end_date ?? goal.deadline ?? null,
      is_timeless: Boolean(goal.is_timeless),
      created_at: goal.created_at,
      updated_at: goal.updated_at ?? goal.created_at,
    }));
  } catch {
    return [];
  }
}

export async function fetchGoalEntries(goalId: string): Promise<GoalEntry[]> {
  try {
    const { data, error } = await supabase
      .from('goal_entries')
      .select('*')
      .eq('goal_id', goalId)
      .order('created_at', { ascending: false });
    if (error) {
      if (isMissingTableError(error)) return [];
      throw error;
    }
    return (data || []) as GoalEntry[];
  } catch {
    return [];
  }
}

export async function saveGoal(goal: Partial<GoalRecord>) {
  const payload = {
    ...goal,
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
    return data as GoalRecord;
  }
  const { data, error } = await supabase.from('goals').insert([payload]).select().single();
  if (error) throw error;
  return data as GoalRecord;
}

export async function saveGoalEntry(entry: Partial<GoalEntry>) {
  const user = await getCurrentAuthUser();
  const payload = {
    ...entry,
    created_by: entry.created_by || user?.id || null,
  };
  const { data, error } = await supabase.from('goal_entries').insert([payload]).select().single();
  if (error) throw error;
  return data as GoalEntry;
}

export async function fetchIntegrations() {
  return safeSelect<IntegrationAccount>('integration_accounts', 'updated_at', false);
}

export async function fetchSyncJobs(limit = 12) {
  const { data, error } = await supabase
    .from('sync_jobs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    if (isMissingTableError(error)) return [] as SyncJob[];
    throw error;
  }

  return (data || []) as SyncJob[];
}

export async function fetchReleases() {
  const rows = await safeSelect<any>('releases', 'release_date', false);
  return rows.map((release) => ({
    id: release.id,
    title: release.title,
    artist_name: release.artist_name ?? release.artist ?? null,
    release_date: release.release_date ?? release.distribution?.release_date ?? null,
    cover_art_url: release.cover_art_url ?? release.assets?.cover_art_url ?? null,
    bpm: release.bpm ?? release.production?.bpm ?? null,
    musical_key: release.musical_key ?? release.production?.key ?? null,
    isrc: release.isrc ?? release.distribution?.isrc ?? null,
    spotify_track_id: release.spotify_track_id ?? release.spotify_data?.track_id ?? null,
    soundcloud_track_id: release.soundcloud_track_id ?? release.distribution?.soundcloud_url ?? null,
    notes: release.notes ?? release.rationale ?? null,
    status: release.status ?? null,
    created_at: release.created_at,
    updated_at: release.updated_at ?? release.created_at,
    playlist_count: release.playlist_count ?? 0,
    notable_playlists: release.notable_playlists ?? [],
    recent_playlist_adds: release.recent_playlist_adds ?? 0,
    playlist_source_provider: release.playlist_source_provider ?? null,
  })) as ReleaseRecord[];
}

export async function fetchReleaseById(releaseId: string) {
  const { data, error } = await supabase.from('releases').select('*').eq('id', releaseId).maybeSingle();
  if (error) {
    if (isMissingTableError(error)) return null;
    throw error;
  }

  if (!data) return null;

  return {
    id: data.id,
    title: data.title,
    artist_name: data.artist_name ?? data.artist ?? null,
    release_date: data.release_date ?? data.distribution?.release_date ?? null,
    cover_art_url: data.cover_art_url ?? data.assets?.cover_art_url ?? null,
    bpm: data.bpm ?? data.production?.bpm ?? null,
    musical_key: data.musical_key ?? data.production?.key ?? null,
    isrc: data.isrc ?? data.distribution?.isrc ?? null,
    spotify_track_id: data.spotify_track_id ?? data.spotify_data?.track_id ?? null,
    soundcloud_track_id: data.soundcloud_track_id ?? data.distribution?.soundcloud_url ?? null,
    notes: data.notes ?? data.rationale ?? null,
    status: data.status ?? null,
    created_at: data.created_at,
    updated_at: data.updated_at ?? data.created_at,
    playlist_count: data.playlist_count ?? 0,
    notable_playlists: data.notable_playlists ?? [],
    recent_playlist_adds: data.recent_playlist_adds ?? 0,
    playlist_source_provider: data.playlist_source_provider ?? null,
  } as ReleaseRecord;
}

export async function uploadReleaseArtwork(releaseId: string, file: File) {
  const user = await getCurrentAuthUser();
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${user?.id || 'public'}/${releaseId}/${Date.now()}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from('release-artwork')
    .upload(path, file, { upsert: false });
  if (uploadError) throw uploadError;

  const { data: publicData } = supabase.storage.from('release-artwork').getPublicUrl(path);
  const { error } = await supabase
    .from('releases')
    .update({
      cover_art_url: publicData.publicUrl,
      updated_at: new Date().toISOString(),
    })
    .eq('id', releaseId);
  if (error) throw error;
  return publicData.publicUrl;
}

export async function saveRelease(data: Partial<ReleaseRecord> & { id?: string }) {
  const user = await getCurrentAuthUser();
  if (data.id) {
    const { id, ...rest } = data;
    const { error } = await supabase
      .from('releases')
      .update({ ...rest, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('releases').insert([
      { ...data, user_id: user?.id ?? null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    ]);
    if (error) throw error;
  }
}

export async function deleteRelease(id: string) {
  const { error } = await supabase.from('releases').delete().eq('id', id);
  if (error) throw error;
}
