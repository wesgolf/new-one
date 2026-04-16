export type ReleaseStatus = 'idea' | 'production' | 'mastered' | 'ready' | 'scheduled' | 'released';

export interface TrackProduction {
  stems_url?: string;
  master_url?: string;
  extended_mix_url?: string;
  project_file_url?: string;
  bpm?: number;
  key?: string;
  collaborators?: string[];
  version_history?: { version: string; date: string; note: string; url: string }[];
}

export interface TrackAssets {
  cover_art_url?: string;
  vertical_video_urls?: string[];
  teaser_clip_urls?: string[];
  short_form_exports?: { type: '15s' | '30s'; url: string }[];
  waveform_video_url?: string;
  production?: TrackProduction;
  distribution?: TrackDistribution;
  marketing?: TrackMarketing;
}

export interface TrackDistribution {
  release_date?: string;
  spotify_url?: string;
  apple_music_url?: string;
  soundcloud_url?: string;
  youtube_url?: string;
  pre_save_url?: string;
  hypeddit_url?: string;
  isrc?: string;
  label?: string;
}

export interface TrackMarketing {
  hook?: string;
  caption_templates?: string[];
  hashtags?: string[];
  content_angles?: string[];
  additional_content_url?: string;
}

export interface TrackPerformance {
  streams: {
    spotify: number;
    apple: number;
    soundcloud: number;
    youtube: number;
  };
  engagement: {
    likes: number;
    saves: number;
    reposts: number;
  };
  growth_rate: number;
  engagement_rate: number;
}

export type ReleaseType = 'Original' | 'Remix' | 'Mashup' | 'On Track Episode' | 'Mix' | 'Other';

export interface Release {
  id: string;
  title: string;
  status: ReleaseStatus;
  type?: ReleaseType;
  release_date?: string;
  soundcloud_url?: string;
  rationale?: string;
  tags?: string[];
  is_public?: boolean;
  production: TrackProduction;
  assets: TrackAssets;
  distribution: TrackDistribution;
  marketing: TrackMarketing;
  performance: TrackPerformance;
  spotify_data?: {
    track_id: string;
    audio_features?: {
      acousticness: number;
      danceability: number;
      duration_ms: number;
      energy: number;
      instrumentalness: number;
      key: number;
      liveness: number;
      loudness: number;
      mode: number;
      speechiness: number;
      tempo: number;
      time_signature: number;
      valence: number;
    };
    audio_analysis?: {
      track: {
        num_samples: number;
        duration: number;
        tempo: number;
        key: number;
        mode: number;
        time_signature: number;
      };
    };
  };
  created_at: string;
}

export interface ContentItem {
  id: string;
  title: string;
  platform: 'Instagram' | 'TikTok' | 'YouTube' | 'Twitter';
  type: 'Reel' | 'TikTok' | 'Story' | 'Post';
  status: 'idea' | 'filming' | 'editing' | 'ready' | 'scheduled' | 'posted';
  scheduled_date?: string;
  scheduled_time?: string;
  hook: string;
  hook_variants?: string[];
  clip_timestamp?: string;
  caption: string;
  cta: string;
  linked_release_id?: string;
  metrics?: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    follows: number;
    profile_clicks?: number;
    conversions?: number;
  };
  performance_score?: number;
}

export interface Opportunity {
  id: string;
  name: string;
  category: 'Venue' | 'Label' | 'Promoter' | 'Collaborator' | 'Playlist';
  contact: string;
  last_contact?: string;
  next_follow_up?: string;
  status: 'cold' | 'warm' | 'active' | 'closed';
  notes?: string;
}

export interface Show {
  id: string;
  venue: string;
  date: string;
  status: 'upcoming' | 'completed';
  prep_checklist: string[];
  crowd_reaction?: string;
  tested_tracks: string[];
}

export interface Todo {
  id: string;
  task: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  due_date?: string;
}

export interface Goal {
  id: string;
  title: string;
  target: number;
  current: number;
  unit: string;
  start_date?: string;
  deadline: string;
  category: 'Streaming' | 'Social' | 'Live' | 'Revenue';
  term: 'short' | 'medium' | 'long';
  manual_progress?: boolean;
}

export interface FinanceTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: 'Streaming' | 'Merch' | 'Live' | 'Royalties' | 'Production' | 'Marketing' | 'Equipment' | 'Software' | 'Other';
  linked_release_id?: string | null;
  notes?: string | null;
}

export interface FinanceSummary {
  total_income: number;
  total_expenses: number;
  net_profit: number;
  by_category: Record<string, number>;
}
