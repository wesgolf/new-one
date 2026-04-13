import { ContentItem, ZernioPostResponse, ContentAnalytics, Platform, ContentStatus, BestPostingTime, PublishLog } from '../types';
import { supabase } from '../../lib/supabase';

const ZERNIO_API_BASE = 'https://zernio.com/api/v1';

const getHeaders = () => {
  const apiKey = import.meta.env.VITE_ZERNIO_API_KEY;
  if (!apiKey) {
    console.warn('VITE_ZERNIO_API_KEY is missing. Zernio API calls will fail.');
  }
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey || ''}`
  };
};

function buildZernioPayload(item: ContentItem, accountId: string, isScheduling: boolean, scheduledAt?: string) {
  const platformKey = item.platform.toLowerCase();
  
  let mediaType = 'image';
  const postTypeLower = (item.post_type || '').toLowerCase();
  if (postTypeLower.includes('reel') || 
      postTypeLower.includes('tiktok') || 
      postTypeLower.includes('video') ||
      item.media_url?.match(/\.(mp4|mov)$/i)) {
    mediaType = 'video';
  }
  
  const mediaItems = item.media_url ? [{ type: mediaType, url: item.media_url }] : [];

  let platformSpecificData: any = undefined;
  const ps = item.platform_settings || {};

  if (platformKey === 'instagram') {
    platformSpecificData = {};
    if (ps.content_type) platformSpecificData.contentType = ps.content_type;
    else if (postTypeLower === 'reel') platformSpecificData.contentType = 'reels';
    else if (postTypeLower === 'story') platformSpecificData.contentType = 'story';
    if (ps.share_to_feed !== undefined) platformSpecificData.shareToFeed = ps.share_to_feed;
    if (ps.first_comment) platformSpecificData.firstComment = ps.first_comment;
    if (ps.collaborators?.length) platformSpecificData.collaborators = ps.collaborators;
    if (ps.cover_image_url) platformSpecificData.instagramThumbnail = ps.cover_image_url;
  }

  const platformEntry: any = {
    platform: platformKey,
    accountId: accountId
  };
  
  if (platformSpecificData && Object.keys(platformSpecificData).length > 0) {
    platformEntry.platformSpecificData = platformSpecificData;
  }

  const payload: any = {
    content: item.caption || item.title || '',
    platforms: [platformEntry]
  };

  if (mediaItems.length > 0) {
    payload.mediaItems = mediaItems;
  }

  if (platformKey === 'tiktok') {
    payload.tiktokSettings = {
      privacy_level: ps.privacy_level || 'PUBLIC_TO_EVERYONE',
      allow_comment: ps.allow_comment !== false,
      allow_duet: ps.allow_duet !== false,
      allow_stitch: ps.allow_stitch !== false,
      video_made_with_ai: ps.video_made_with_ai || false,
      content_preview_confirmed: true,
      express_consent_given: true,
      commercialContentType: ps.commercial_content || 'none',
    };
  }

  if (isScheduling && scheduledAt) {
    payload.scheduledFor = scheduledAt;
    payload.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } else {
    payload.publishNow = true;
  }

  return payload;
}

async function logPublishAction(
  contentItemId: string,
  action: PublishLog['action'],
  platform: string,
  status: 'success' | 'failed',
  zernioResponse?: any,
  errorMessage?: string
) {
  try {
    await supabase.from('publish_logs').insert([{
      content_item_id: contentItemId,
      action,
      platform,
      status,
      zernio_response: zernioResponse || {},
      error_message: errorMessage,
    }]);
  } catch (err) {
    console.error('Failed to log publish action:', err);
  }
}

export const zernioAdapter = {
  async configCheck(): Promise<any> {
    try {
      const response = await fetch(`${ZERNIO_API_BASE}/accounts`, {
        headers: getHeaders()
      });
      if (!response.ok) throw new Error('API Key invalid or network error');
      return { status: 'ok' };
    } catch (error) {
      console.error('Zernio: Config check failed', error);
      return { error: 'Failed to reach Zernio API' };
    }
  },

  async fetchAccounts(): Promise<any[]> {
    try {
      const response = await fetch(`${ZERNIO_API_BASE}/accounts`, {
        headers: getHeaders()
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `Zernio API error: ${response.statusText}`);
      }
      const data = await response.json();
      
      const accounts = Array.isArray(data) ? data : (data?.accounts || []);
      return accounts.map((a: any) => ({
        ...a,
        id: a.id || a._id,
        name: a.name || a.username || a.display_name || 'Unknown Account'
      }));
    } catch (error) {
      console.error('ZernioAdapter: Fetch accounts failed', error);
      throw error;
    }
  },

  async postContent(item: ContentItem): Promise<ZernioPostResponse> {
    try {
      const accounts = await this.fetchAccounts();
      const platformKey = item.platform.toLowerCase();
      const account = accounts.find((a: any) => a.platform.toLowerCase() === platformKey);

      if (!account) {
        throw new Error(`No connected Zernio account found for platform: ${item.platform}`);
      }

      const response = await fetch(`${ZERNIO_API_BASE}/posts`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(buildZernioPayload(item, account.id || account._id, false))
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Zernio API error: ${response.statusText} ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      const post = data.post || data;
      const result: ZernioPostResponse = {
        id: post.id || post._id || post.job_id,
        status: 'success',
        platform_post_id: post.platform_post_id
      };

      await logPublishAction(item.id, 'publish', item.platform, 'success', data);
      return result;
    } catch (error: any) {
      console.error('Zernio: Post failed', error);
      await logPublishAction(item.id, 'publish', item.platform, 'failed', undefined, error.message);
      if (!import.meta.env.VITE_ZERNIO_API_KEY) {
        return this.mockPost(item);
      }
      return { id: '', status: 'failed', error: error.message };
    }
  },

  async scheduleContent(item: ContentItem, scheduledAt: string): Promise<ZernioPostResponse> {
    try {
      const accounts = await this.fetchAccounts();
      const platformKey = item.platform.toLowerCase();
      const account = accounts.find((a: any) => a.platform.toLowerCase() === platformKey);

      if (!account) {
        throw new Error(`No connected Zernio account found for platform: ${item.platform}`);
      }

      const response = await fetch(`${ZERNIO_API_BASE}/posts`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(buildZernioPayload(item, account.id || account._id, true, scheduledAt))
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Zernio API error: ${response.statusText} ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      const post = data.post || data;
      const result: ZernioPostResponse = {
        id: post.job_id || post.id || post._id,
        status: 'success'
      };

      await logPublishAction(item.id, 'schedule', item.platform, 'success', data);
      return result;
    } catch (error: any) {
      console.error('Zernio: Scheduling failed', error);
      await logPublishAction(item.id, 'schedule', item.platform, 'failed', undefined, error.message);
      if (!import.meta.env.VITE_ZERNIO_API_KEY) {
        return this.mockSchedule(item, scheduledAt);
      }
      return { id: '', status: 'failed', error: error.message };
    }
  },

  async cancelScheduledPost(item: ContentItem): Promise<boolean> {
    try {
      const postId = item.zernio_post_id || item.zernio_job_id;
      if (!postId || postId.startsWith('zernio_') || postId.startsWith('mock_')) {
        await logPublishAction(item.id, 'cancel', item.platform, 'success');
        return true;
      }

      const response = await fetch(`${ZERNIO_API_BASE}/posts/${postId}`, {
        method: 'DELETE',
        headers: getHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `Zernio API error: ${response.statusText}`);
      }

      await logPublishAction(item.id, 'cancel', item.platform, 'success');
      return true;
    } catch (error: any) {
      console.error('Zernio: Cancel failed', error);
      await logPublishAction(item.id, 'cancel', item.platform, 'failed', undefined, error.message);
      if (!import.meta.env.VITE_ZERNIO_API_KEY) {
        return true;
      }
      throw error;
    }
  },

  async deletePost(postId: string): Promise<boolean> {
    try {
      if (postId.startsWith('zernio_') || postId.startsWith('mock_')) {
        return true;
      }

      const response = await fetch(`${ZERNIO_API_BASE}/posts/${postId}`, {
        method: 'DELETE',
        headers: getHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `Zernio API error: ${response.statusText}`);
      }

      return true;
    } catch (error) {
      console.error('Zernio: Delete post failed', error);
      throw error;
    }
  },

  async getSocialAccounts(): Promise<any[]> {
    const response = await fetch(`${ZERNIO_API_BASE}/social-accounts`, {
      headers: getHeaders()
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || err.message || `${response.status}`);
    }
    const data = await response.json();
    const accounts = Array.isArray(data) ? data : (data.accounts || data.socialAccounts || []);
    return accounts.map((a: any) => ({ ...a, id: a.id || a._id }));
  },

  async getBestPostingTimes(platform: Platform): Promise<BestPostingTime[]> {
    const apiKey = import.meta.env.VITE_ZERNIO_API_KEY;
    if (!apiKey) return this.mockBestPostingTimes(platform);

    try {
      const accounts = await this.getSocialAccounts();
      const platformKey = platform.toLowerCase();
      const account = accounts.find((a: any) =>
        (a.platform || '').toLowerCase() === platformKey
      );
      if (!account) return this.mockBestPostingTimes(platform);

      const tz = encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone);
      const response = await fetch(
        `${ZERNIO_API_BASE}/social-accounts/${account.id}/best-times?timezone=${tz}&range=90d&granularity=hour`,
        { headers: getHeaders() }
      );
      if (!response.ok) return this.mockBestPostingTimes(platform);

      const data = await response.json();
      const buckets: any[] = data.bestTimes || data.best_times || data.times || data.slots || [];
      if (!buckets.length) return this.mockBestPostingTimes(platform);

      const maxScore = Math.max(...buckets.map((b: any) => b.score ?? b.value ?? b.engagement ?? 1), 1);
      const dayMap: Record<number, string> = { 0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat' };

      return buckets.map((b: any) => {
        const rawScore = b.score ?? b.value ?? b.engagement ?? 0;
        const normalised = Math.round((rawScore / maxScore) * 100);
        const hour = b.hour ?? parseInt((b.time || '0').split(':')[0], 10);
        const dayOfWeek = b.dayOfWeek ?? b.day_of_week ?? b.day ?? 0;
        const dayName = typeof dayOfWeek === 'number' ? (dayMap[dayOfWeek] ?? 'Mon') : dayOfWeek;
        const timeStr = `${String(hour).padStart(2, '0')}:00`;
        return {
          platform,
          day: dayName,
          time: timeStr,
          score: normalised,
          label: b.label || b.reason || undefined,
        } as BestPostingTime;
      }).sort((a, b) => b.score - a.score);
    } catch {
      return this.mockBestPostingTimes(platform);
    }
  },

  async syncPostAnalytics(externalPostId: string, platform: Platform): Promise<ContentAnalytics> {
    try {
      return this.mockAnalytics(externalPostId, platform);
    } catch (error) {
      console.error('Zernio: Analytics sync failed', error);
      return this.mockAnalytics(externalPostId, platform);
    }
  },

  async fetchPosts(): Promise<ContentItem[]> {
    try {
      const response = await fetch(`${ZERNIO_API_BASE}/posts`, {
        headers: getHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `Zernio API error: ${response.statusText}`);
      }

      const data = await response.json();
      const posts = Array.isArray(data) ? data : (data.posts || []);
      
      return posts.map((post: any) => ({
        id: post.id || post._id,
        user_id: 'user_1',
        title: post.metadata?.title || post.content?.substring(0, 30) || 'Untitled',
        hook: post.content?.split('\n')[0] || '',
        caption: post.content || '',
        hashtags: post.hashtags || [],
        platform: this.mapPlatform(post.platforms?.[0]?.platform || post.platform || 'instagram'),
        post_type: post.metadata?.post_type || 'drop_clip',
        angle: post.metadata?.angle || 'hype',
        status: this.mapStatus(post.status || 'idea'),
        publish_status: this.mapPublishStatus(post.status),
        platform_settings: post.platform_settings || {},
        track_id: post.metadata?.track_id,
        scheduled_at: post.scheduledFor || post.scheduled_at,
        posted_at: post.posted_at,
        external_post_id: post.platform_post_id,
        zernio_post_id: post.id || post._id,
        created_at: post.created_at || new Date().toISOString(),
        updated_at: post.updated_at || post.created_at || new Date().toISOString()
      }));
    } catch (error) {
      console.error('ZernioAdapter: Fetch posts failed', error);
      throw error;
    }
  },

  async fetchAnalytics(): Promise<ContentAnalytics[]> {
    try {
      const response = await fetch(`${ZERNIO_API_BASE}/analytics`, {
        headers: getHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `Zernio API error: ${response.statusText}`);
      }

      const data = await response.json();
      const analytics = Array.isArray(data) ? data : (data.analytics || data.posts || []);
      
      return analytics.map((ana: any) => ({
        id: ana.id || ana._id,
        content_item_id: ana.post_id,
        platform: this.mapPlatform(ana.platform || 'instagram'),
        date: ana.date || new Date().toISOString(),
        views: ana.views || 0,
        likes: ana.likes || 0,
        comments: ana.comments || 0,
        shares: ana.shares || 0,
        saves: ana.saves || 0,
        clicks: ana.clicks || 0,
        engagement_rate: ana.engagement_rate || 0,
        performance_score: ana.performance_score || 0,
        velocity: ana.velocity || 0
      }));
    } catch (error) {
      console.error('ZernioAdapter: Fetch analytics failed', error);
      throw error;
    }
  },

  mapPlatform(platform: string): Platform {
    const p = platform.toLowerCase();
    if (p.includes('instagram')) return 'Instagram';
    if (p.includes('tiktok')) return 'TikTok';
    if (p.includes('youtube')) return 'YouTube';
    if (p.includes('twitter') || p.includes('x')) return 'Twitter';
    return 'Instagram';
  },

  mapStatus(status: string): ContentStatus {
    const s = status.toLowerCase();
    if (s === 'posted' || s === 'published') return 'posted';
    if (s === 'scheduled') return 'scheduled';
    if (s === 'draft') return 'drafting';
    return 'idea';
  },

  mapPublishStatus(status: string): 'draft' | 'scheduled' | 'published' | 'failed' | 'cancelled' {
    const s = (status || '').toLowerCase();
    if (s === 'published' || s === 'posted') return 'published';
    if (s === 'scheduled') return 'scheduled';
    if (s === 'failed') return 'failed';
    if (s === 'cancelled') return 'cancelled';
    return 'draft';
  },

  async mockPost(item: ContentItem): Promise<ZernioPostResponse> {
    return {
      id: `zernio_${Math.random().toString(36).substr(2, 9)}`,
      status: 'success',
      platform_post_id: `ext_${item.platform.toLowerCase()}_${Date.now()}`
    };
  },

  async mockSchedule(item: ContentItem, scheduledAt: string): Promise<ZernioPostResponse> {
    return {
      id: `zernio_job_${Math.random().toString(36).substr(2, 9)}`,
      status: 'success'
    };
  },

  mockBestPostingTimes(platform: Platform): BestPostingTime[] {
    const timesMap: Record<Platform, BestPostingTime[]> = {
      Instagram: [
        { platform: 'Instagram', day: 'Mon', time: '11:00', score: 92, label: 'Peak engagement' },
        { platform: 'Instagram', day: 'Wed', time: '14:00', score: 88, label: 'High reach' },
        { platform: 'Instagram', day: 'Fri', time: '10:00', score: 85, label: 'Strong saves' },
        { platform: 'Instagram', day: 'Sat', time: '09:00', score: 82, label: 'Weekend boost' },
        { platform: 'Instagram', day: 'Thu', time: '19:00', score: 80, label: 'Evening spike' },
        { platform: 'Instagram', day: 'Tue', time: '12:00', score: 78, label: 'Lunch traffic' },
      ],
      TikTok: [
        { platform: 'TikTok', day: 'Tue', time: '19:00', score: 95, label: 'Viral window' },
        { platform: 'TikTok', day: 'Thu', time: '12:00', score: 90, label: 'FYP boost' },
        { platform: 'TikTok', day: 'Sat', time: '20:00', score: 88, label: 'Weekend prime' },
        { platform: 'TikTok', day: 'Mon', time: '18:00', score: 84, label: 'After work' },
        { platform: 'TikTok', day: 'Fri', time: '17:00', score: 82, label: 'TGIF traffic' },
        { platform: 'TikTok', day: 'Wed', time: '15:00', score: 79, label: 'Mid-week' },
      ],
      YouTube: [
        { platform: 'YouTube', day: 'Fri', time: '15:00', score: 91, label: 'Pre-weekend' },
        { platform: 'YouTube', day: 'Sat', time: '11:00', score: 89, label: 'Weekend browse' },
        { platform: 'YouTube', day: 'Wed', time: '17:00', score: 86, label: 'Mid-week push' },
        { platform: 'YouTube', day: 'Sun', time: '14:00', score: 83, label: 'Sunday chill' },
        { platform: 'YouTube', day: 'Thu', time: '16:00', score: 80, label: 'Steady views' },
      ],
      Twitter: [
        { platform: 'Twitter', day: 'Mon', time: '09:00', score: 87, label: 'Morning buzz' },
        { platform: 'Twitter', day: 'Wed', time: '12:00', score: 85, label: 'Lunch chat' },
        { platform: 'Twitter', day: 'Thu', time: '10:00', score: 82, label: 'News cycle' },
        { platform: 'Twitter', day: 'Fri', time: '14:00', score: 80, label: 'End of week' },
      ],
    };
    return timesMap[platform] || [];
  },

  async mockAnalytics(externalPostId: string, platform: Platform): Promise<ContentAnalytics> {
    const views = Math.floor(Math.random() * 50000) + 1000;
    const likes = Math.floor(views * 0.05);
    const engagementRate = 5.2;
    return {
      id: `ana_${Date.now()}`,
      content_item_id: '',
      platform,
      date: new Date().toISOString(),
      views,
      likes,
      comments: Math.floor(likes * 0.1),
      shares: Math.floor(likes * 0.05),
      saves: Math.floor(likes * 0.08),
      clicks: Math.floor(views * 0.01),
      engagement_rate: engagementRate,
      performance_score: engagementRate * 1.5 + (views / 1000),
      velocity: Math.random() * 10
    };
  }
};
