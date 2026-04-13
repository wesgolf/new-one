import type { NormalizedDataPackage } from '../../core/types.ts';
import type { SoundCloudRawData } from './types.ts';

export class SoundCloudMapper {
  static mapToNormalized(rawData: SoundCloudRawData): NormalizedDataPackage {
    const date = new Date().toISOString().split('T')[0];
    
    return {
      profile: {
        name: rawData.profile.name,
        url: rawData.profile.url,
        followers: rawData.profile.followers,
        following: rawData.profile.following,
        track_count: rawData.profile.trackCount,
        total_plays: rawData.profile.totalPlays,
      },
      tracks: rawData.tracks.map(t => ({
        external_id: t.id,
        title: t.title,
        url: t.url,
      })),
      platformMetrics: {
        date,
        followers: rawData.profile.followers,
        following: rawData.profile.following,
        total_plays: rawData.insights?.totalPlays || 0,
        total_likes: rawData.insights?.totalLikes || 0,
        total_reposts: rawData.insights?.totalReposts || 0,
        total_comments: rawData.insights?.totalComments || 0,
        total_downloads: rawData.insights?.totalDownloads || 0,
      },
      trackMetrics: rawData.tracks.map(t => ({
        track_id: t.id,
        date,
        plays: t.plays,
        likes: t.likes,
        reposts: t.reposts,
        comments: t.comments,
        downloads: t.downloads,
      })),
      locations: rawData.insights?.locations.map(l => ({
        date,
        country: l.country,
        city: l.city,
        plays: l.plays,
      })) || [],
      sources: rawData.insights?.sources.map(s => ({
        date,
        source: s.source,
        plays: s.plays,
      })) || [],
    };
  }
}
