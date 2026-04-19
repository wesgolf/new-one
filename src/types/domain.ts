export type IntegrationProvider =
  | 'spotify'
  | 'soundcloud'
  | 'zernio'
  | 'youtube'
  | 'songstats'
  | 'soundcharts'
  | 'manual';

export type ConnectionStatus = 'connected' | 'disconnected' | 'expired' | 'error' | 'pending';
export type SyncJobStatus = 'queued' | 'running' | 'success' | 'failed';

export interface IntegrationAccount {
  id: string;
  provider: IntegrationProvider | string;
  user_id?: string | null;
  workspace_id?: string | null;
  connection_status: ConnectionStatus;
  access_token?: string | null;
  refresh_token?: string | null;
  token_expires_at?: string | null;
  last_synced_at?: string | null;
  last_sync_status?: SyncJobStatus | null;
  last_error?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SyncJob {
  id: string;
  provider: IntegrationProvider | string;
  job_type: string;
  status: SyncJobStatus;
  started_at?: string | null;
  completed_at?: string | null;
  error_message?: string | null;
  metadata?: Record<string, any> | null;
  created_at?: string;
}

export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'blocked';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface TaskRecord {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_to?: string | null;
  created_by?: string | null;
  due_date?: string | null;
  completed_at?: string | null;
  related_type?: string | null;
  related_id?: string | null;
  created_at?: string;
  updated_at?: string;
  assignee_name?: string | null;
  creator_name?: string | null;
}

export interface IdeaRecord {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  is_collab?: boolean;
  is_public?: boolean;
  user_id?: string | null;
  created_at?: string;
  updated_at?: string;
  share_slug?: string | null;
  artist_name?: string | null;
  bpm?: number | null;
  key_sig?: string | null;
  genre?: string | null;
  mood?: string | null;
}

export type IdeaAssetType = 'audio' | 'link' | 'cover' | 'project_link';

export interface IdeaAsset {
  id: string;
  idea_id: string;
  file_url: string;
  file_path?: string | null;
  asset_type: IdeaAssetType;
  metadata?: Record<string, any> | null;
  created_at?: string;
}

export interface IdeaComment {
  id: string;
  idea_id: string;
  author_id?: string | null;
  body: string;
  timestamp_seconds?: number | null;
  created_at?: string;
  author_name?: string | null;
}

export type GoalType = 'count' | 'ratio' | 'milestone' | 'custom';
export type GoalTrackingMode = 'manual' | 'automatic' | 'hybrid';

export interface GoalRecord {
  id: string;
  title: string;
  description?: string | null;
  goal_type: GoalType;
  tracking_mode: GoalTrackingMode;
  target_value?: number | null;
  current_value?: number | null;
  source_metric?: string | null;
  formula?: Record<string, any> | null;
  unit?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_timeless?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface GoalEntry {
  id: string;
  goal_id: string;
  value: number;
  note?: string | null;
  created_by?: string | null;
  created_at?: string;
}

export interface OutreachEmail {
  id: string;
  contact_id: string;
  subject: string;
  body: string;
  status: 'draft' | 'sent' | 'failed';
  sent_at?: string | null;
  opened_at?: string | null;
  created_by?: string | null;
  created_at?: string;
}

export interface OpportunityContact {
  id: string;
  user_id?: string | null;
  name: string;
  category: 'Venue' | 'Label' | 'Promoter' | 'Collaborator' | 'Playlist' | string;
  contact?: string | null;
  last_contact?: string | null;
  next_follow_up?: string | null;
  status: 'cold' | 'warm' | 'active' | 'closed';
  notes?: string | null;
  priority?: 'low' | 'medium' | 'high' | null;
  tags?: string[] | null;
  relationship_strength?: number | null;
  last_interaction_notes?: string | null;
  created_at?: string;
}

export interface ProfileSummary {
  id: string;
  full_name?: string | null;
  role?: string | null;
  email?: string | null;
}

export interface ReleaseRecord {
  id: string;
  title: string;
  artist_name?: string | null;
  release_date?: string | null;
  cover_art_url?: string | null;
  bpm?: number | null;
  musical_key?: string | null;
  isrc?: string | null;
  spotify_track_id?: string | null;
  soundcloud_track_id?: string | null;
  notes?: string | null;
  status?: string | null;
  created_at?: string;
  updated_at?: string;
  playlist_count?: number | null;
  notable_playlists?: string[] | null;
  recent_playlist_adds?: number | null;
  playlist_source_provider?: string | null;
}

export interface PublicHubLink {
  id: string;
  label: string;
  href: string;
  description?: string;
  /** Lucide icon name key, e.g. 'Music2', 'Radio', 'Users' */
  icon?: string;
  category?: 'music' | 'social' | 'collab' | 'contact' | 'merch';
  /** True = opens in new tab via <a>; false = SPA route via <Link> */
  external?: boolean;
  /** Renders a brand-accent ring to visually elevate the card */
  highlight?: boolean;
  /** Controls render order (ascending) */
  order?: number;
  /** Legacy tailwind accent class — kept for backward compat */
  accent?: string;
}

// ─── Weekly Report ────────────────────────────────────────────────────────────

export type ReportSectionId =
  | 'wins'
  | 'losses'
  | 'content_performance'
  | 'release_highlights'
  | 'task_summary'
  | 'action_items'
  | 'sync_issues';

export interface ReportItem {
  text: string;
  meta?: string;
  status?: 'positive' | 'negative' | 'neutral' | 'warning';
  tag?: string;
}

export interface WeeklyReportSection {
  id: ReportSectionId;
  title: string;
  narrative?: string;
  items: ReportItem[];
  stats?: Array<{ label: string; value: string | number }>;
}

export interface WeeklyReportConfig {
  startDate: string; // ISO date string
  endDate: string;   // ISO date string
  sections: ReportSectionId[];
  label?: string;
}

export interface WeeklyReport {
  id: string;
  config: WeeklyReportConfig;
  generatedAt: string;
  artistName: string;
  sections: WeeklyReportSection[];
  executiveSummary?: string;
}

// ─── Assistant Actions ────────────────────────────────────────────────────────

export interface AssistantAction {
  type:
    | 'create_task'
    | 'open_content_scheduler'
    | 'open_release'
    | 'create_calendar_event'
    | 'change_track_status'
    | 'navigate';
  label: string;
  payload?: Record<string, any>;
  requiresConfirmation?: boolean;
}

export interface AnalyticsOverviewMetric {
  id: string;
  label: string;
  value: number;
  unit?: string;
  sourceProvider: string;
  trend?: number | null;
}

export interface AnalyticsDomainPayload {
  audience: AnalyticsOverviewMetric[];
  streaming: AnalyticsOverviewMetric[];
  playlist: AnalyticsOverviewMetric[];
  social: AnalyticsOverviewMetric[];
  releases: AnalyticsOverviewMetric[];
}

export interface AnalyticsProviderState {
  provider: string;
  status: 'ready' | 'not_configured' | 'error';
  lastSyncedAt?: string | null;
  errorMessage?: string | null;
}

