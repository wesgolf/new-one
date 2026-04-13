/**
 * Normalized Analytics Data Schema
 */

export type PlatformType = 'soundcloud' | 'spotify' | 'applemusic';

export interface NormalizedPlatform {
  id: string;
  name: string;
  type: PlatformType;
}

export interface NormalizedArtistProfile {
  id: string;
  platform_id: string;
  external_id: string;
  name: string;
  url: string;
  followers: number;
  following: number;
  track_count: number;
  total_plays: number;
  last_scraped_at: string;
}

export interface NormalizedTrack {
  id: string;
  artist_id: string;
  external_id: string;
  title: string;
  url: string;
  release_date?: string;
  metadata?: Record<string, any>;
}

export interface DailyPlatformMetrics {
  id: string;
  artist_id: string;
  date: string; // YYYY-MM-DD
  followers: number;
  following: number;
  total_plays: number;
  total_likes: number;
  total_reposts: number;
  total_comments: number;
  total_downloads: number;
}

export interface DailyTrackMetrics {
  id: string;
  track_id: string;
  date: string; // YYYY-MM-DD
  plays: number;
  likes: number;
  reposts: number;
  comments: number;
  downloads: number;
}

export interface AudienceLocation {
  id: string;
  artist_id: string;
  date: string;
  country: string;
  city?: string;
  plays: number;
}

export interface TrafficSource {
  id: string;
  artist_id: string;
  date: string;
  source: string;
  plays: number;
}

export interface ScrapeRun {
  id: string;
  platform: PlatformType;
  started_at: string;
  finished_at?: string;
  status: 'pending' | 'success' | 'failed';
  error?: string;
  raw_output_path?: string;
}

/**
 * Shared Platform Interface
 */
export abstract class IPlatformScraper {
  abstract name: PlatformType;
  abstract checkLoginState(page: any): Promise<boolean>;
  abstract scrape(page: any): Promise<any>; // Raw data
  abstract mapToNormalized(rawData: any): Promise<NormalizedDataPackage>;
}

export interface NormalizedDataPackage {
  profile: Partial<NormalizedArtistProfile>;
  tracks: Partial<NormalizedTrack>[];
  platformMetrics: Partial<DailyPlatformMetrics>;
  trackMetrics: Partial<DailyTrackMetrics>[];
  locations: Partial<AudienceLocation>[];
  sources: Partial<TrafficSource>[];
}
