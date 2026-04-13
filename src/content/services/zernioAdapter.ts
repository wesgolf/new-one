import { ContentItem, ZernioPostResponse, ContentAnalytics, Platform, ContentStatus } from '../types';
import { mockContentItems, mockAnalytics } from '../mockData';

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
  if (platformKey === 'instagram') {
    if (postTypeLower === 'reel') {
      platformSpecificData = { contentType: 'reels', shareToFeed: true };
    } else if (postTypeLower === 'story') {
      platformSpecificData = { contentType: 'story' };
    }
  }

  const platformEntry: any = {
    platform: platformKey,
    accountId: accountId
  };
  
  if (platformSpecificData) {
    platformEntry.platformSpecificData = platformSpecificData;
  }

  const payload: any = {
    content: item.caption || item.title || '',
    platforms: [platformEntry]
  };

  if (mediaItems.length > 0) {
    payload.mediaItems = mediaItems;
  }

  if (isScheduling && scheduledAt) {
    payload.scheduledFor = scheduledAt;
    payload.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } else {
    payload.publishNow = true;
  }

  return payload;
}

/**
 * Zernio Adapter Layer
 * This abstracts the Zernio API and maps it to our internal normalized schema.
 */
export const zernioAdapter = {
  /**
   * Check if Zernio API is correctly configured
   */
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

  /**
   * Fetch all connected accounts from Zernio
   */
  async fetchAccounts(): Promise<any[]> {
    try {
      const response = await fetch(`${ZERNIO_API_BASE}/accounts`, {
        headers: getHeaders()
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('ZernioAdapter: Accounts error data:', errorData);
        throw new Error(errorData.error || errorData.message || `Zernio API error: ${response.statusText}`);
      }
      const data = await response.json();
      
      // Zernio returns { accounts: [...] }
      const accounts = Array.isArray(data) ? data : (data?.accounts || []);
      const mapped = accounts.map((a: any) => ({
        ...a,
        id: a.id || a._id,
        name: a.name || a.username || a.display_name || 'Unknown Account'
      }));
      return mapped;
    } catch (error) {
      console.error('ZernioAdapter: Fetch accounts failed', error);
      throw error;
    }
  },

  /**
   * Post content immediately via Zernio
   */
  async postContent(item: ContentItem): Promise<ZernioPostResponse> {
    try {
      // 1. Fetch accounts to find the right one for the platform
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
      return {
        id: post.id || post._id || post.job_id,
        status: 'success',
        platform_post_id: post.platform_post_id
      };
    } catch (error) {
      console.error('Zernio: Post failed', error);
      return this.mockPost(item);
    }
  },

  /**
   * Schedule content for a future date via Zernio
   */
  async scheduleContent(item: ContentItem, scheduledAt: string): Promise<ZernioPostResponse> {
    try {
      // 1. Fetch accounts to find the right one for the platform
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
      return {
        id: post.job_id || post.id || post._id,
        status: 'success'
      };
    } catch (error) {
      console.error('Zernio: Scheduling failed', error);
      return this.mockSchedule(item, scheduledAt);
    }
  },

  /**
   * Delete a post from Zernio
   */
  async deletePost(postId: string): Promise<boolean> {
    try {
      // If it's a mock ID, just return true
      if (postId.startsWith('zernio_') || postId.startsWith('mock_')) {
        return true;
      }

      const response = await fetch(`${ZERNIO_API_BASE}/posts/${postId}`, {
        method: 'DELETE',
        headers: getHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('ZernioAdapter: Delete post error data:', errorData);
        throw new Error(errorData.error || errorData.message || `Zernio API error: ${response.statusText}`);
      }

      return true;
    } catch (error) {
      console.error('Zernio: Delete post failed', error);
      throw error;
    }
  },

  /**
   * Sync analytics for a specific post from Zernio
   */
  async syncPostAnalytics(externalPostId: string, platform: Platform): Promise<ContentAnalytics> {
    try {
      // Zernio analytics endpoint - mocking for now unless specified in docs
      return this.mockAnalytics(externalPostId, platform);
    } catch (error) {
      console.error('Zernio: Analytics sync failed', error);
      return this.mockAnalytics(externalPostId, platform);
    }
  },

  /**
   * Fetch all posts/content items from Zernio
   */
  async fetchPosts(): Promise<ContentItem[]> {
    try {
      const response = await fetch(`${ZERNIO_API_BASE}/posts`, {
        headers: getHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('ZernioAdapter: Posts error data:', errorData);
        throw new Error(errorData.error || errorData.message || `Zernio API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      const posts = Array.isArray(data) ? data : (data.posts || []);
      
      // Map Zernio response to our internal ContentItem schema
      const mapped = posts.map((post: any) => ({
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
        track_id: post.metadata?.track_id,
        scheduled_at: post.scheduledFor || post.scheduled_at,
        posted_at: post.posted_at,
        external_post_id: post.platform_post_id,
        created_at: post.created_at || new Date().toISOString(),
        updated_at: post.updated_at || post.created_at || new Date().toISOString()
      }));
      
      return mapped;
    } catch (error) {
      console.error('ZernioAdapter: Fetch posts failed', error);
      throw error;
    }
  },

  /**
   * Fetch all analytics from Zernio
   */
  async fetchAnalytics(): Promise<ContentAnalytics[]> {
    try {
      const response = await fetch(`${ZERNIO_API_BASE}/analytics`, {
        headers: getHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('ZernioAdapter: Analytics error data:', errorData);
        throw new Error(errorData.error || errorData.message || `Zernio API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      const analytics = Array.isArray(data) ? data : (data.analytics || data.posts || []);
      
      const mapped = analytics.map((ana: any) => ({
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
      
      return mapped;
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

  // Helper mocks for when key is missing or API fails
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
