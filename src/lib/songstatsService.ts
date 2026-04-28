import { fetchServerJsonWithFallback } from './serverApi';

/**
 * Songstats Enterprise API v1 — typed service layer
 *
 * All functions are safe async wrappers. They throw on non-2xx responses
 * so callers can handle errors appropriately.
 *
 * Required env vars:
 *   VITE_SONGSTATS_API_KEY   — your enterprise API key
 *   VITE_SONGSTATS_ARTIST_ID — your songstats_artist_id (e.g. "48ra1cnv")
 */

// All calls go through the server-side proxy at /api/songstats
// to avoid CORS — the proxy (server.ts) injects the API key.
const BASE = '/api/songstats';

const fetchSongstatsData = async (endpoint: string) => {
  const response = await fetch(`/api/songstats${endpoint}`);

  if (!response.ok) {
    throw new Error('Analytics API route is not configured correctly.');
  }

  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error('Invalid response format. Expected JSON.');
  }

  return response.json();
};

async function get<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${BASE}${path}`, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  return fetchServerJsonWithFallback<T>(
    `${url.pathname}${url.search}`,
    `songstats${path}${url.search}`,
    { headers: { Accept: 'application/json' } },
  );
}

// ─── Shared sub-types ────────────────────────────────────────────────────────

export interface SongstatsArtistRef {
  name: string;
  songstats_artist_id: string;
}

export interface SongstatsArtistInfo {
  songstats_artist_id: string;
  avatar: string;
  name: string;
  site_url: string;
  links?: Array<{ source: string; external_id: string; url: string }>;
}

export interface SongstatsTrackInfo {
  songstats_track_id: string;
  avatar: string;
  title: string;
  release_date: string;
  site_url: string;
  artists?: SongstatsArtistRef[];
  labels?: Array<{ name: string; songstats_label_id: string }>;
  isrcs?: string[];
}

// ─── /sources ────────────────────────────────────────────────────────────────

export interface SongstatsSource {
  id: string;
  name: string;
}

export interface SourcesResponse {
  result: string;
  message: string;
  sources: SongstatsSource[];
}

export function fetchSources(): Promise<SourcesResponse> {
  return get<SourcesResponse>('/sources');
}

// ─── /definitions ────────────────────────────────────────────────────────────

export interface DefinitionsResponse {
  result: string;
  message: string;
  definitions: {
    data_type_definitions: Record<string, string>;
    rank_type_definitions: Record<string, string>;
  };
}

export function fetchDefinitions(): Promise<DefinitionsResponse> {
  return get<DefinitionsResponse>('/definitions');
}

// ─── /artists/info ───────────────────────────────────────────────────────────

export interface ArtistInfoResponse {
  result: string;
  message: string;
  artist_info: SongstatsArtistInfo & {
    genres?: string[];
    links?: Array<{ source: string; external_id: string; url: string }>;
  };
  source_ids?: string[] | string | null;
}

export function fetchArtistInfo(
  songstatsArtistId: string,
  sourceIds?: string,
): Promise<ArtistInfoResponse> {
  const params: Record<string, string> = { songstats_artist_id: songstatsArtistId };
  if (sourceIds) params.source_ids = sourceIds;
  return get<ArtistInfoResponse>('/artists/info', params);
}

// ─── /artists/stats ──────────────────────────────────────────────────────────

export interface ArtistStatEntry {
  source: string;
  data: Record<string, number>;
}

export interface ArtistStatsResponse {
  result: string;
  message: string;
  stats: ArtistStatEntry[];
  artist_info: SongstatsArtistInfo;
  source_ids?: string[] | string | null;
}

export function fetchArtistStats(
  songstatsArtistId: string,
  sourceIds = 'all',
): Promise<ArtistStatsResponse> {
  return get<ArtistStatsResponse>('/artists/stats', {
    songstats_artist_id: songstatsArtistId,
    source_ids: sourceIds,
  });
}

// ─── /artists/activities ─────────────────────────────────────────────────────

export interface ArtistActivity {
  source: string;
  activity_text: string;
  activity_type: string;
  activity_date: string;
  activity_url: string | null;
  activity_avatar: string | null;
  activity_tier: number;
  track_info: SongstatsTrackInfo & { artists?: SongstatsArtistRef[] };
}

export interface ArtistActivitiesResponse {
  result: string;
  message: string;
  data: ArtistActivity[];
}

export function fetchArtistActivities(
  songstatsArtistId: string,
  options?: { sourceIds?: string; limit?: number; offset?: number },
): Promise<ArtistActivitiesResponse> {
  const params: Record<string, string> = { songstats_artist_id: songstatsArtistId };
  if (options?.sourceIds) params.source_ids = options.sourceIds;
  if (options?.limit != null) params.limit = String(options.limit);
  if (options?.offset != null) params.offset = String(options.offset);
  return get<ArtistActivitiesResponse>('/artists/activities', params);
}

// ─── /artists/historic_stats ─────────────────────────────────────────────────

export interface ArtistHistoricStatEntry {
  source: string;
  data: { history: Array<Record<string, number | string>> };
}

export interface ArtistHistoricStatsResponse {
  result: string;
  message: string;
  stats: ArtistHistoricStatEntry[];
  artist_info: SongstatsArtistInfo;
  source_ids?: string[] | string | null;
}

export function fetchArtistHistoricStats(
  songstatsArtistId: string,
  options?: { sourceIds?: string; startDate?: string; endDate?: string },
): Promise<ArtistHistoricStatsResponse> {
  const params: Record<string, string> = { songstats_artist_id: songstatsArtistId };
  if (options?.sourceIds) params.source_ids = options.sourceIds;
  if (options?.startDate) params.start_date = options.startDate;
  if (options?.endDate) params.end_date = options.endDate;
  return get<ArtistHistoricStatsResponse>('/artists/historic_stats', params);
}

// ─── /artists/audience ───────────────────────────────────────────────────────

export interface ArtistAudienceEntry {
  source: string;
  data: Record<string, unknown[]>;
}

export interface ArtistAudienceResponse {
  result: string;
  message: string;
  audience: ArtistAudienceEntry[];
  artist_info: SongstatsArtistInfo;
  source_ids?: string[] | string | null;
}

export function fetchArtistAudience(
  songstatsArtistId: string,
  sourceIds = 'all',
): Promise<ArtistAudienceResponse> {
  return get<ArtistAudienceResponse>('/artists/audience', {
    songstats_artist_id: songstatsArtistId,
    source_ids: sourceIds,
  });
}

// ─── /artists/audience/details ───────────────────────────────────────────────

export interface ArtistAudienceDetailsResponse {
  result: string;
  message: string;
  audience: ArtistAudienceEntry[];
  artist_info: SongstatsArtistInfo;
  source_ids?: string[] | string | null;
}

export function fetchArtistAudienceDetails(
  songstatsArtistId: string,
  sourceIds = 'all',
): Promise<ArtistAudienceDetailsResponse> {
  return get<ArtistAudienceDetailsResponse>('/artists/audience/details', {
    songstats_artist_id: songstatsArtistId,
    source_ids: sourceIds,
  });
}

// ─── /artists/catalog ────────────────────────────────────────────────────────

export interface ArtistCatalogTrack extends SongstatsTrackInfo {
  artists: SongstatsArtistRef[];
}

export interface ArtistCatalogResponse {
  result: string;
  message: string;
  catalog: ArtistCatalogTrack[];
  artist_info: SongstatsArtistInfo & {
    links?: Array<{ source: string; external_id: string; url: string }>;
  };
  tracks_total: number;
  next_url?: string | null;
}

export function fetchArtistCatalog(
  songstatsArtistId: string,
  options?: { limit?: number; offset?: number; sourceIds?: string },
): Promise<ArtistCatalogResponse> {
  const params: Record<string, string> = {
    songstats_artist_id: songstatsArtistId,
    source_ids: options?.sourceIds ?? 'all',
  };
  if (options?.limit != null) params.limit = String(options.limit);
  if (options?.offset != null) params.offset = String(options.offset);
  return get<ArtistCatalogResponse>('/artists/catalog', params);
}

// ─── /artists/songshare ──────────────────────────────────────────────────────

export interface ArtistSongshareData {
  songstats_artist_id: string;
  name: string;
  total_track_visits: number;
  total_track_clicks: number;
  total_track_click_through_rate: number;
  artist_visits: number;
  artist_clicks: number;
  artist_click_through_rate: number;
  artist_clicks_by_source: Record<string, number>;
  total_track_clicks_by_source: Record<string, number>;
}

export interface ArtistSongshareResponse {
  result: string;
  message: string;
  data: ArtistSongshareData;
}

export function fetchArtistSongshare(
  songstatsArtistId: string,
): Promise<ArtistSongshareResponse> {
  return get<ArtistSongshareResponse>('/artists/songshare', {
    songstats_artist_id: songstatsArtistId,
  });
}

// ─── /tracks/info ────────────────────────────────────────────────────────────

export interface TrackFullInfo extends SongstatsTrackInfo {
  is_remix: boolean;
  collaborators?: Array<{ name: string; roles: string[]; songstats_collaborator_id: string }>;
  labels?: Array<{ name: string; songstats_label_id: string }>;
  distributors?: Array<{ name: string }>;
  genres?: string[];
  links?: Array<{ source: string; external_id: string; url: string; isrc?: string }>;
}

export interface AudioAnalysisItem {
  key: string;
  value: string;
}

export interface TrackInfoResponse {
  result: string;
  message: string;
  track_info: TrackFullInfo;
  audio_analysis?: AudioAnalysisItem[];
}

export function fetchTrackInfo(
  songstatsTrackId: string,
  sourceIds?: string,
): Promise<TrackInfoResponse> {
  const params: Record<string, string> = { songstats_track_id: songstatsTrackId };
  if (sourceIds) params.source_ids = sourceIds;
  return get<TrackInfoResponse>('/tracks/info', params);
}

// ─── /tracks/stats ───────────────────────────────────────────────────────────

export interface TrackStatEntry {
  source: string;
  data: Record<string, number>;
}

export interface TrackStatsResponse {
  result: string;
  message: string;
  stats: TrackStatEntry[];
  track_info: SongstatsTrackInfo;
  source_ids?: string[] | string | null;
}

export function fetchTrackStats(
  songstatsTrackId: string,
  sourceIds = 'all',
): Promise<TrackStatsResponse> {
  return get<TrackStatsResponse>('/tracks/stats', {
    songstats_track_id: songstatsTrackId,
    source_ids: sourceIds,
  });
}

// ─── /tracks/activities ──────────────────────────────────────────────────────

export interface TrackActivity {
  source: string;
  activity_text: string;
  activity_type: string;
  activity_date: string;
  activity_url: string | null;
  activity_avatar: string | null;
  activity_tier: number;
}

export interface TrackActivitiesResponse {
  result: string;
  message: string;
  activities: TrackActivity[];
  track_info: SongstatsTrackInfo;
  source_ids?: string[] | string | null;
}

export function fetchTrackActivities(
  songstatsTrackId: string,
  options?: { sourceIds?: string; limit?: number; offset?: number },
): Promise<TrackActivitiesResponse> {
  const params: Record<string, string> = { songstats_track_id: songstatsTrackId };
  if (options?.sourceIds) params.source_ids = options.sourceIds;
  if (options?.limit != null) params.limit = String(options.limit);
  if (options?.offset != null) params.offset = String(options.offset);
  return get<TrackActivitiesResponse>('/tracks/activities', params);
}

// ─── /tracks/historic_stats ──────────────────────────────────────────────────

export interface TrackHistoricStatEntry {
  source: string;
  data: { history: Array<Record<string, number | string>> };
}

export interface TrackHistoricStatsResponse {
  result: string;
  message: string;
  stats: TrackHistoricStatEntry[];
  track_info: SongstatsTrackInfo;
  source_ids?: string[] | string | null;
}

export function fetchTrackHistoricStats(
  songstatsTrackId: string,
  options?: { sourceIds?: string; startDate?: string; endDate?: string },
): Promise<TrackHistoricStatsResponse> {
  const params: Record<string, string> = { songstats_track_id: songstatsTrackId };
  if (options?.sourceIds) params.source_ids = options.sourceIds;
  if (options?.startDate) params.start_date = options.startDate;
  if (options?.endDate) params.end_date = options.endDate;
  return get<TrackHistoricStatsResponse>('/tracks/historic_stats', params);
}

// ─── /tracks/locations ───────────────────────────────────────────────────────

export interface TrackLocationEntry {
  source: string;
  data: Record<string, unknown[]>;
}

export interface TrackLocationsResponse {
  result: string;
  message: string;
  locations: TrackLocationEntry[];
  track_info: SongstatsTrackInfo;
  source_ids?: string[] | string | null;
}

export function fetchTrackLocations(
  songstatsTrackId: string,
  sourceIds = 'all',
): Promise<TrackLocationsResponse> {
  return get<TrackLocationsResponse>('/tracks/locations', {
    songstats_track_id: songstatsTrackId,
    source_ids: sourceIds,
  });
}

// ─── /tracks/comments ────────────────────────────────────────────────────────

export interface TrackCommentItem {
  name: string;
  image_url: string | null;
  external_url: string | null;
  record_date: string;
  comment: string;
  likes: number | null;
  replies: number | null;
  followers: number;
  category: string;
  sentiment: number;
}

export interface TrackCommentSource {
  source: string;
  sentiments: {
    overall_sentiment_score: number;
    sentiment_category: string;
  };
  keywords: string[];
  comments: TrackCommentItem[];
}

export interface TrackCommentsResponse {
  result: string;
  message: string;
  comments: TrackCommentSource[];
  track_info: SongstatsTrackInfo;
  source_ids?: string[] | string | null;
}

export function fetchTrackComments(
  songstatsTrackId: string,
  sourceIds?: string,
): Promise<TrackCommentsResponse> {
  const params: Record<string, string> = { songstats_track_id: songstatsTrackId };
  if (sourceIds) params.source_ids = sourceIds;
  return get<TrackCommentsResponse>('/tracks/comments', params);
}

// ─── /tracks/songshare ───────────────────────────────────────────────────────

export interface TrackSongshareData {
  songstats_track_id: string;
  title: string;
  track_visits: number;
  track_clicks: number;
  track_click_through_rate: number;
  track_clicks_by_source: Record<string, number>;
}

export interface TrackSongshareResponse {
  result: string;
  message: string;
  data: TrackSongshareData;
}

export function fetchTrackSongshare(
  songstatsTrackId: string,
): Promise<TrackSongshareResponse> {
  return get<TrackSongshareResponse>('/tracks/songshare', {
    songstats_track_id: songstatsTrackId,
  });
}
