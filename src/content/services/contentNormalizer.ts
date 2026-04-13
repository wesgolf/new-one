import { ContentItem, ContentAnalytics, Platform, PostType, ContentStatus, ContentAngle } from '../types';

/**
 * Content Normalizer
 * This maps external data (from Zernio) into our internal normalized schema.
 */
export const contentNormalizer = {
  /**
   * Normalizes a Zernio post into a ContentItem.
   */
  normalizeZernioPost(zernioPost: any): Partial<ContentItem> {
    return {
      external_post_id: zernioPost.id,
      zernio_job_id: zernioPost.job_id,
      status: zernioPost.status === 'published' ? 'posted' : 'scheduled',
      posted_at: zernioPost.published_at,
      scheduled_at: zernioPost.scheduled_for,
      platform: this.mapPlatform(zernioPost.platform),
      media_url: zernioPost.media?.[0]?.url
    };
  },

  /**
   * Normalizes Zernio analytics into ContentAnalytics.
   */
  normalizeZernioAnalytics(zernioAnalytics: any, contentItemId: string): ContentAnalytics {
    const views = zernioAnalytics.reach || zernioAnalytics.views || 0;
    const likes = zernioAnalytics.likes || 0;
    const comments = zernioAnalytics.comments || 0;
    const shares = zernioAnalytics.shares || 0;
    const saves = zernioAnalytics.saves || 0;
    const clicks = zernioAnalytics.clicks || 0;
    
    const engagementRate = views > 0 ? ((likes + comments + shares + saves) / views) * 100 : 0;

    return {
      id: `ana_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      content_item_id: contentItemId,
      platform: this.mapPlatform(zernioAnalytics.platform),
      date: new Date().toISOString(),
      views,
      likes,
      comments,
      shares,
      saves,
      clicks,
      engagement_rate: engagementRate,
      performance_score: engagementRate * 1.5 + (views / 1000),
      velocity: zernioAnalytics.velocity || 0
    };
  },

  /**
   * Maps external platform names to internal Platform type.
   */
  mapPlatform(externalPlatform: string): Platform {
    const p = externalPlatform.toLowerCase();
    if (p.includes('insta')) return 'Instagram';
    if (p.includes('tiktok')) return 'TikTok';
    if (p.includes('youtube')) return 'YouTube';
    if (p.includes('twitter') || p.includes('x')) return 'Twitter';
    return 'Instagram'; // Default
  }
};
