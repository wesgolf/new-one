import { PlatformPost } from '../content/types';
import { PublishResult } from './publishService';
import { fetchJson } from '../lib/api';

const ZERNIO_API_BASE = 'https://zernio.com/api/v1';

const getHeaders = () => {
  const apiKey = import.meta.env.VITE_ZERNIO_API_KEY;
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey || ''}`
  };
};

const hasApiKey = () => !!import.meta.env.VITE_ZERNIO_API_KEY;

/** True when VITE_ZERNIO_API_KEY is set — exposed so UI can show setup prompts */
export const zernioConfigured = hasApiKey;

function notConfiguredResult(): PublishResult {
  return {
    success: false,
    error: 'Publishing integration not configured. Set VITE_ZERNIO_API_KEY to enable external publishing.',
  };
}

function buildPayload(post: PlatformPost, mediaUrl?: string, scheduledAt?: string) {
  const payload: Record<string, any> = {
    content: post.caption || post.title || post.description || '',
    platforms: [{
      platform: post.platform.toLowerCase(),
      accountId: 'default',
    }],
  };

  if (mediaUrl) {
    payload.mediaItems = [{ type: 'video', url: mediaUrl }];
  }

  const settings = post.platform_settings_json || {};

  if (post.platform === 'Instagram') {
    const igData: Record<string, any> = {
      shareToFeed: settings.share_to_feed !== false,
    };
    if (settings.cover_image_url) {
      igData.instagramThumbnail = settings.cover_image_url;
    } else if (settings.thumb_offset_ms != null) {
      igData.thumbOffset = settings.thumb_offset_ms;
    }
    payload.platforms[0].platformSpecificData = igData;
  }

  if (post.platform === 'TikTok') {
    // TikTok settings go at the top level as tiktokSettings with camelCase keys
    payload.tiktokSettings = {
      privacyLevel: settings.privacy_level || 'PUBLIC_TO_EVERYONE',
      allowComment: settings.allow_comments !== false,
      allowDuet: settings.allow_duet !== false,
      allowStitch: settings.allow_stitch !== false,
      contentPreviewConfirmed: true,
      expressConsentGiven: true,
    };
  }

  if (post.platform === 'YouTube') {
    const ytData: Record<string, any> = {
      title: post.title || '',
      visibility: settings.privacy || 'public',
    };
    if (settings.category_id) ytData.categoryId = settings.category_id;
    if (settings.made_for_kids != null) ytData.madeForKids = settings.made_for_kids;
    payload.platforms[0].platformSpecificData = ytData;
    if (settings.tags?.length) {
      payload.tags = settings.tags;
    }
  }

  if (scheduledAt) {
    payload.scheduledFor = scheduledAt;
    payload.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } else {
    payload.publishNow = true;
  }

  return payload;
}

async function postToZernio(payload: Record<string, any>): Promise<PublishResult> {
  const data = await fetchJson<any>(`${ZERNIO_API_BASE}/posts`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });

  const post = data?.post || data;
  return {
    success: true,
    externalPostId: post.id || post._id || post.job_id,
    externalPostUrl: post.platform_post_url || post.url,
  };
}

export type ZernioAccount = {
  _id: string;
  platform: string;
  username?: string;
  displayName?: string;
  profileImageUrl?: string;
  status?: string;
};

export type ZernioPost = {
  _id: string;
  content: string;
  status: 'draft' | 'scheduled' | 'published' | 'failed';
  scheduledFor?: string;
  publishedAt?: string;
  platforms: { platform: string; accountId: string; status?: string; platformPostUrl?: string }[];
  mediaItems?: { type: string; url: string }[];
};

export type BestTime = {
  dayOfWeek: number;
  hour: number;
  score: number;
};

export const zernioService = {
  async listAccounts(): Promise<ZernioAccount[]> {
    if (!hasApiKey()) return [];
    const data = await fetchJson<{ accounts: ZernioAccount[] }>(`${ZERNIO_API_BASE}/accounts`, {
      headers: getHeaders(),
    });
    return data?.accounts ?? [];
  },


  async publishInstagramPost(post: PlatformPost, mediaUrl?: string): Promise<PublishResult> {
    if (!hasApiKey()) return notConfiguredResult();
    return postToZernio(buildPayload(post, mediaUrl));
  },

  async publishTikTokPost(post: PlatformPost, mediaUrl?: string): Promise<PublishResult> {
    if (!hasApiKey()) return notConfiguredResult();
    return postToZernio(buildPayload(post, mediaUrl));
  },

  async publishYouTubeShort(post: PlatformPost, mediaUrl?: string): Promise<PublishResult> {
    if (!hasApiKey()) return notConfiguredResult();
    return postToZernio(buildPayload(post, mediaUrl));
  },

  async scheduleInstagramPost(post: PlatformPost, scheduledAt: string, mediaUrl?: string): Promise<PublishResult> {
    if (!hasApiKey()) return notConfiguredResult();
    return postToZernio(buildPayload(post, mediaUrl, scheduledAt));
  },

  async scheduleTikTokPost(post: PlatformPost, scheduledAt: string, mediaUrl?: string): Promise<PublishResult> {
    if (!hasApiKey()) return notConfiguredResult();
    return postToZernio(buildPayload(post, mediaUrl, scheduledAt));
  },

  async scheduleYouTubeShort(post: PlatformPost, scheduledAt: string, mediaUrl?: string): Promise<PublishResult> {
    if (!hasApiKey()) return notConfiguredResult();
    return postToZernio(buildPayload(post, mediaUrl, scheduledAt));
  },

  async listPosts(params?: { status?: string; limit?: number }): Promise<ZernioPost[]> {
    if (!hasApiKey()) return [];
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.limit) qs.set('limit', String(params.limit));
    const data = await fetchJson<{ posts: ZernioPost[] }>(`${ZERNIO_API_BASE}/posts?${qs}`, {
      headers: getHeaders(),
    });
    return data?.posts ?? [];
  },

  async getBestTimes(platform?: string): Promise<BestTime[]> {
    if (!hasApiKey()) return [];
    try {
      const qs = platform ? `?platform=${platform}` : '';
      const data = await fetchJson<{ bestTimes: BestTime[] }>(
        `${ZERNIO_API_BASE}/analytics/best-time-to-post${qs}`,
        { headers: getHeaders() }
      );
      return data?.bestTimes ?? [];
    } catch {
      return [];
    }
  },

  async createPost(payload: Record<string, any>): Promise<{ id: string; url?: string }> {
    if (!hasApiKey()) throw new Error('VITE_ZERNIO_API_KEY not configured');
    const data = await fetchJson<any>(`${ZERNIO_API_BASE}/posts`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    const post = data?.post || data;
    return { id: post.id || post._id || post.job_id, url: post.platform_post_url || post.url };
  },

  async cancelPost(zernioPostId: string): Promise<boolean> {
    if (!hasApiKey()) return false;
    const response = await fetch(`${ZERNIO_API_BASE}/posts/${zernioPostId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Cancel failed: ${response.statusText}`);
    }
    return true;
  },
};
