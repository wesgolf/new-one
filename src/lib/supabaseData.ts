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
  const message = String(error?.message || '');
  const details = String(error?.details || '');
  const hint = String(error?.hint || '');

  return Boolean(
    error &&
      (
        // PostgREST schema-cache missing relation
        error.code === 'PGRST205' ||
        error.code === '42P01' ||
        message.includes('Could not find the table') ||
        (message.includes('relation') && message.includes('does not exist')) ||
        details.includes('Could not find the table') ||
        hint.includes('Could not find the table')
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

function mapReleaseRecord(row: any): ReleaseRecord {
  return {
    id: row.id,
    title: row.title,
    artist_name: row.artist_name ?? row.artist ?? null,
    type: row.type ?? null,
    release_date: row.release_date ?? row.distribution?.release_date ?? null,
    cover_art_url: row.cover_art_url ?? row.assets?.cover_art_url ?? null,
    bpm: row.bpm ?? row.production?.bpm ?? null,
    musical_key: row.musical_key ?? row.production?.key ?? null,
    isrc: row.isrc ?? row.distribution?.isrc ?? null,
    spotify_track_id: row.spotify_track_id ?? row.spotify_data?.track_id ?? null,
    soundcloud_track_id: row.soundcloud_track_id ?? row.distribution?.soundcloud_url ?? null,
    songstats_track_id: row.songstats_track_id ?? null,
    notes: row.notes ?? row.rationale ?? null,
    status: row.status ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at ?? row.created_at,
    playlist_count: row.playlist_count ?? 0,
    notable_playlists: row.notable_playlists ?? [],
    recent_playlist_adds: row.recent_playlist_adds ?? 0,
    playlist_source_provider: row.playlist_source_provider ?? null,
    distribution: {
      spotify_url: row.distribution?.spotify_url ?? null,
      apple_music_url: row.distribution?.apple_music_url ?? null,
      soundcloud_url: row.distribution?.soundcloud_url ?? null,
      youtube_url: row.distribution?.youtube_url ?? null,
    },
    performance: {
      streams: {
        spotify: Number(row.performance?.streams?.spotify ?? 0),
        apple: Number(row.performance?.streams?.apple ?? 0),
        soundcloud: Number(row.performance?.streams?.soundcloud ?? 0),
        youtube: Number(row.performance?.streams?.youtube ?? 0),
      },
      youtube_stats: row.performance?.youtube_stats ?? row.youtube_stats ?? null,
    },
    soundcloud_stats: row.soundcloud_stats ?? null,
    youtube_stats: row.performance?.youtube_stats ?? row.youtube_stats ?? null,
  } as ReleaseRecord;
}

const RELEASE_LIST_SELECT_WITH_ARTIST = [
  'id',
  'title',
  'artist',
  'type',
  'release_date',
  'cover_art_url',
  'bpm',
  'musical_key',
  'isrc',
  'spotify_track_id',
  'soundcloud_track_id',
  'songstats_track_id',
  'status',
  'playlist_count',
  'notable_playlists',
  'recent_playlist_adds',
  'playlist_source_provider',
  'distribution',
  'performance',
  'soundcloud_stats',
  'youtube_stats',
  'created_at',
  'updated_at',
].join(',');

const RELEASE_LIST_SELECT_WITH_ARTIST_NAME = [
  'id',
  'title',
  'artist_name',
  'type',
  'release_date',
  'cover_art_url',
  'bpm',
  'musical_key',
  'isrc',
  'spotify_track_id',
  'soundcloud_track_id',
  'songstats_track_id',
  'status',
  'playlist_count',
  'notable_playlists',
  'recent_playlist_adds',
  'playlist_source_provider',
  'distribution',
  'performance',
  'soundcloud_stats',
  'youtube_stats',
  'created_at',
  'updated_at',
].join(',');

const PUBLIC_HUB_SELECT_WITH_ARTIST = [
  'id',
  'title',
  'artist',
  'type',
  'release_date',
  'cover_art_url',
  'spotify_track_id',
  'soundcloud_track_id',
  'status',
  'created_at',
  'updated_at',
  'distribution',
  'performance',
].join(',');

const PUBLIC_HUB_SELECT_WITH_ARTIST_NAME = [
  'id',
  'title',
  'artist_name',
  'type',
  'release_date',
  'cover_art_url',
  'spotify_track_id',
  'soundcloud_track_id',
  'status',
  'created_at',
  'updated_at',
  'distribution',
  'performance',
].join(',');

function isMissingColumnError(error: any, column: string) {
  return error?.code === '42703' && String(error?.message || '').includes(column);
}

function normalizeReleaseWritePayload(
  payload: Partial<ReleaseRecord> & Record<string, any>,
  artistField: 'artist' | 'artist_name',
) {
  const { artist_name, artist, ...rest } = payload;
  const next: Record<string, any> = { ...rest };
  const artistValue = artist_name ?? artist ?? null;
  if (artistValue !== null && artistValue !== undefined && artistValue !== '') {
    next[artistField] = artistValue;
  }
  return next;
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
      .select('*, profiles:author_id ( full_name, avatar_url )')
      .eq('idea_id', ideaId)
      .order('created_at', { ascending: false });
    if (error) {
      if (isMissingTableError(error)) return [];
      throw error;
    }
    // Flatten the joined profile data onto each comment row
    return ((data || []) as any[]).map((row) => ({
      ...row,
      author_name: row.author_name || row.profiles?.full_name || null,
      avatar_url:  row.avatar_url  || row.profiles?.avatar_url  || null,
      profiles: undefined,
    })) as IdeaComment[];
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
    created_by: idea.user_id || user?.id || null,
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
  const authorId = comment.author_id || user?.id || null;

  // Stamp author_name at write time so it survives profile renames gracefully
  let authorName = comment.author_name || null;
  if (!authorName && authorId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', authorId)
      .maybeSingle();
    if (profile?.full_name) authorName = profile.full_name;
  }

  const payload = {
    ...comment,
    author_id:   authorId,
    author_name: authorName,
  };
  const { data, error } = await supabase.from('idea_comments').insert([payload]).select().single();
  if (error) throw error;
  return data as IdeaComment;
}

export async function updateIdeaCommentTimestamp(id: string, timestampSeconds: number | null): Promise<void> {
  const { error } = await supabase
    .from('idea_comments')
    .update({ timestamp_seconds: timestampSeconds })
    .eq('id', id);
  if (error) throw error;
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
  console.groupCollapsed('[Releases] fetchReleases');
  const user = await getCurrentAuthUser();
  let query = supabase.from('releases').select('*').order('release_date', { ascending: false });
  if (user?.id) query = query.eq('user_id', user.id);
  const { data, error } = await query;
  if (error) {
    console.error('[Releases] fetchReleases failed:', {
      message: error.message,
      details: (error as any)?.details ?? null,
      hint: (error as any)?.hint ?? null,
      code: (error as any)?.code ?? null,
    });
    console.groupEnd();
    if (isMissingTableError(error)) return [] as ReleaseRecord[];
    throw error;
  }
  const rows = (data || []) as any[];
  console.log('[Releases] Raw row count:', rows.length);
  const mapped = rows.map(mapReleaseRecord);
  console.log('[Releases] Mapped release ids:', mapped.map((release) => release.id));
  console.groupEnd();
  return mapped;
}

export async function fetchReleaseList() {
  console.groupCollapsed('[Releases] fetchReleaseList');
  const user = await getCurrentAuthUser();
  const runQuery = async (selectClause: string) => {
    let query = supabase
      .from('releases')
      .select(selectClause)
      .order('release_date', { ascending: false })
      .order('created_at', { ascending: false });
    if (user?.id) query = query.eq('user_id', user.id);
    return query;
  };

  let { data, error } = await runQuery(RELEASE_LIST_SELECT_WITH_ARTIST);

  if (error && isMissingColumnError(error, 'artist')) {
    console.warn('[Releases] fetchReleaseList retrying with artist_name column due to legacy/new schema mismatch.');
    ({ data, error } = await runQuery(RELEASE_LIST_SELECT_WITH_ARTIST_NAME));
  }

  if (error) {
    console.error('[Releases] fetchReleaseList failed:', {
      message: error.message,
      details: (error as any)?.details ?? null,
      hint: (error as any)?.hint ?? null,
      code: (error as any)?.code ?? null,
    });
    console.groupEnd();
    if (isMissingTableError(error)) return [] as ReleaseRecord[];
    throw error;
  }

  const mapped = (data || []).map(mapReleaseRecord);
  console.log('[Releases] List row count:', mapped.length);
  console.groupEnd();
  return mapped;
}

export async function fetchPublicHubReleases() {
  const runQuery = (selectClause: string) =>
    supabase
      .from('releases')
      .select(selectClause)
      .order('release_date', { ascending: false })
      .order('created_at', { ascending: false });

  let { data, error } = await runQuery(PUBLIC_HUB_SELECT_WITH_ARTIST);

  if (error && isMissingColumnError(error, 'artist')) {
    ({ data, error } = await runQuery(PUBLIC_HUB_SELECT_WITH_ARTIST_NAME));
  }

  if (error) {
    if (isMissingTableError(error)) return [] as ReleaseRecord[];
    throw error;
  }

  return (data || []).map(mapReleaseRecord);
}

export async function fetchReleaseById(releaseId: string) {
  const user = await getCurrentAuthUser();
  let query = supabase.from('releases').select('*').eq('id', releaseId);
  if (user?.id) {
    query = query.eq('user_id', user.id);
  }
  const { data, error } = await query.maybeSingle();
  if (error) {
    if (isMissingTableError(error)) return null;
    throw error;
  }

  if (!data) return null;

  return mapReleaseRecord(data);
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
  console.groupCollapsed('[Releases] saveRelease');
  console.log('[Releases] Incoming payload summary:', {
    id: data.id ?? null,
    title: data.title ?? null,
    status: data.status ?? null,
    release_date: data.release_date ?? null,
    soundcloud_track_id: data.soundcloud_track_id ?? null,
    spotify_track_id: data.spotify_track_id ?? null,
    hasDistribution: Boolean(data.distribution),
    hasPerformance: Boolean(data.performance),
  });
  const user = await getCurrentAuthUser();
  console.log('[Releases] Resolved auth user id:', user?.id ?? null);
  if (data.id) {
    const { id, ...rest } = data;
    console.log('[Releases] Mode: update existing release', { id });
    let payload = normalizeReleaseWritePayload(
      { ...rest, updated_at: new Date().toISOString() },
      'artist',
    );
    let { error } = await supabase
      .from('releases')
      .update(payload)
      .eq('id', id);
    if (error && isMissingColumnError(error, 'artist')) {
      payload = normalizeReleaseWritePayload(
        { ...rest, updated_at: new Date().toISOString() },
        'artist_name',
      );
      ({ error } = await supabase
        .from('releases')
        .update(payload)
        .eq('id', id));
    }
    if (error) {
      console.error('[Releases] Update failed:', {
        id,
        message: error.message,
        details: (error as any)?.details ?? null,
        hint: (error as any)?.hint ?? null,
        code: (error as any)?.code ?? null,
        status: (error as any)?.status ?? null,
      });
      console.groupEnd();
      throw error;
    }
    console.log('[Releases] Update succeeded:', { id });
  } else {
    let insertPayload = normalizeReleaseWritePayload({
      ...data,
      user_id: user?.id ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, 'artist');
    console.log('[Releases] Mode: insert new release', {
      title: insertPayload.title ?? null,
      user_id: insertPayload.user_id ?? null,
      release_date: insertPayload.release_date ?? null,
      soundcloud_track_id: insertPayload.soundcloud_track_id ?? null,
    });
    let { error } = await supabase.from('releases').insert([insertPayload]);
    if (error && isMissingColumnError(error, 'artist')) {
      insertPayload = normalizeReleaseWritePayload({
        ...data,
        user_id: user?.id ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, 'artist_name');
      ({ error } = await supabase.from('releases').insert([insertPayload]));
    }
    if (error) {
      console.error('[Releases] Insert failed:', {
        title: insertPayload.title ?? null,
        user_id: insertPayload.user_id ?? null,
        message: error.message,
        details: (error as any)?.details ?? null,
        hint: (error as any)?.hint ?? null,
        code: (error as any)?.code ?? null,
        status: (error as any)?.status ?? null,
      });
      console.groupEnd();
      throw error;
    }
    console.log('[Releases] Insert succeeded:', {
      title: insertPayload.title ?? null,
      user_id: insertPayload.user_id ?? null,
    });
  }
  console.groupEnd();
}

export async function deleteRelease(id: string) {
  const { error } = await supabase.from('releases').delete().eq('id', id);
  if (error) throw error;
}
