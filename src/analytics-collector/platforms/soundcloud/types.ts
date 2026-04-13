export interface SoundCloudRawData {
  profile: {
    name: string;
    url: string;
    followers: number;
    following: number;
    trackCount: number;
    totalPlays: number;
  };
  tracks: SoundCloudRawTrack[];
  insights?: {
    totalPlays: number;
    totalLikes: number;
    totalReposts: number;
    totalComments: number;
    totalDownloads: number;
    locations: { country: string; city?: string; plays: number }[];
    sources: { source: string; plays: number }[];
  };
  scrapedAt: string;
}

export interface SoundCloudRawTrack {
  id: string;
  title: string;
  url: string;
  plays: number;
  likes: number;
  reposts: number;
  comments: number;
  downloads: number;
  releaseDate?: string;
}
