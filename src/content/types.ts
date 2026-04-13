import { Release } from '../types';

export type ContentStatus = 'idea' | 'drafting' | 'ready' | 'scheduled' | 'posted';
export type PublishStatus = 'draft' | 'scheduled' | 'published' | 'failed' | 'cancelled';
export type Platform = 'Instagram' | 'TikTok' | 'YouTube' | 'Twitter';
export type PostType = 'drop_clip' | 'teaser' | 'talking' | 'mashup' | 'performance' | 'tutorial' | 'behind_the_scenes';
export type ContentAngle = 'educational' | 'emotional' | 'hype' | 'personal' | 'technical';

export interface PlatformSettings {
  [key: string]: any;
}

export interface ContentItem {
  id: string;
  user_id: string;
  track_id?: string;
  title: string;
  hook: string;
  caption: string;
  hashtags: string[];
  platform: Platform;
  post_type: PostType;
  angle: ContentAngle;
  media_url?: string;
  clip_start?: string;
  clip_end?: string;
  status: ContentStatus;
  publish_status?: PublishStatus;
  platform_settings?: PlatformSettings;
  scheduled_at?: string;
  posted_at?: string;
  external_post_id?: string;
  zernio_job_id?: string;
  zernio_post_id?: string;
  publish_error?: string;
  created_at: string;
  updated_at: string;
  cta?: string;
}

export interface PublishLog {
  id: string;
  content_item_id: string;
  action: 'schedule' | 'publish' | 'cancel' | 'reschedule' | 'fail';
  platform: Platform;
  status: 'success' | 'failed';
  zernio_response?: any;
  error_message?: string;
  created_at: string;
}

export interface BestPostingTime {
  platform: Platform;
  day: string;
  time: string;
  score: number;
  label?: string;
}

export interface ContentAnalytics {
  id: string;
  content_item_id: string;
  platform: Platform;
  date: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  clicks: number;
  watch_time?: number;
  engagement_rate: number;
  performance_score: number;
  velocity: number;
}

export interface ContentReflection {
  id: string;
  content_item_id: string;
  verdict: 'high_performer' | 'average' | 'underperformer';
  summary: string;
  why_it_worked: string[];
  why_it_didnt: string[];
  next_experiment: string;
  generated_at: string;
}

export interface ContentPlanSuggestion {
  id: string;
  type: 'daily' | 'weekly' | 'release_campaign';
  linked_track_id?: string;
  title: string;
  description: string;
  suggested_platform: Platform;
  suggested_post_type: PostType;
  suggested_date: string;
  priority_score: number;
  rationale: string;
}

export interface ZernioPostResponse {
  id: string;
  status: 'success' | 'failed' | 'pending';
  platform_post_id?: string;
  error?: string;
}
