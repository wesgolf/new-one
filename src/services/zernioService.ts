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
    payload.platforms[0].platformSpecificData = {
      contentType: 'reels',
      shareToFeed: settings.share_to_feed !== false,
    };
    if (settings.cover_image_url) {
      payload.platforms[0].platformSpecificData.instagramThumbnail = settings.cover_image_url;
    }
  }

  if (post.platform === 'TikTok') {
    payload.tiktokSettings = {
      privacy_level: settings.privacy_level || 'PUBLIC_TO_EVERYONE',
      allow_comment: settings.allow_comments !== false,
      allow_duet: settings.allow_duet !== false,
      allow_stitch: settings.allow_stitch !== false,
      content_preview_confirmed: true,
      express_consent_given: true,
    };
  }

  if (post.platform === 'YouTube') {
    payload.platforms[0].platformSpecificData = {
      title: post.title || '',
      description: post.description || '',
      tags: settings.tags || [],
      category: settings.category || 'Music',
      privacyStatus: settings.privacy || 'public',
      madeForKids: settings.audience === 'kids',
    };
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

export const zernioService = {
  // TODO: Replace with real Zernio Instagram endpoint when credentials are set
  async publishInstagramPost(post: PlatformPost, mediaUrl?: string): Promise<PublishResult> {
    if (!hasApiKey()) return notConfiguredResult();
    return postToZernio(buildPayload(post, mediaUrl));
  },

  // TODO: Replace with real Zernio TikTok endpoint when credentials are set
  async publishTikTokPost(post: PlatformPost, mediaUrl?: string): Promise<PublishResult> {
    if (!hasApiKey()) return notConfiguredResult();
    return postToZernio(buildPayload(post, mediaUrl));
  },

  // TODO: Replace with real Zernio YouTube endpoint when credentials are set
  async publishYouTubeShort(post: PlatformPost, mediaUrl?: string): Promise<PublishResult> {
    if (!hasApiKey()) return notConfiguredResult();
    return postToZernio(buildPayload(post, mediaUrl));
  },

  // TODO: Replace with real Zernio scheduling endpoints when credentials are set
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
