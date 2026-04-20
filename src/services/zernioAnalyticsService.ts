/**
 * Zernio Analytics Service
 * Fetches analytics + accounts + recent posts from Zernio via the server proxy.
 * Defensively normalizes the response shape since Zernio's API isn't strictly typed here.
 */
import { fetchJson } from '../lib/api';

export interface ZernioAccount {
  id: string;
  platform: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  followers?: number;
  following?: number;
  posts?: number;
  engagement?: number;
  raw?: any;
}

export interface ZernioPost {
  id: string;
  platform: string;
  caption?: string;
  thumbnailUrl?: string;
  postUrl?: string;
  publishedAt?: string;
  status?: string;
  likes?: number;
  comments?: number;
  shares?: number;
  views?: number;
  engagement?: number;
  raw?: any;
}

export interface ZernioAnalyticsSnapshot {
  configured: boolean;
  error?: string;
  accounts: ZernioAccount[];
  posts: ZernioPost[];
  rawAnalytics?: any;
  fetchedAt?: string;
}

const PLATFORM_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  tiktok:    'TikTok',
  youtube:   'YouTube',
  twitter:   'X (Twitter)',
  x:         'X (Twitter)',
  facebook:  'Facebook',
  threads:   'Threads',
  linkedin:  'LinkedIn',
};

function normalizePlatform(p: any): string {
  if (!p) return 'unknown';
  const s = String(p).toLowerCase().trim();
  return PLATFORM_LABELS[s] ? s : s;
}

function pickNumber(...values: any[]): number | undefined {
  for (const v of values) {
    if (typeof v === 'number' && !isNaN(v)) return v;
    if (typeof v === 'string' && v.trim() && !isNaN(Number(v))) return Number(v);
  }
  return undefined;
}

function pickString(...values: any[]): string | undefined {
  for (const v of values) {
    if (typeof v === 'string' && v.trim()) return v;
  }
  return undefined;
}

function unwrapList(payload: any, ...keys: string[]): any[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  for (const k of keys) {
    if (Array.isArray(payload[k])) return payload[k];
  }
  // Check nested data wrapper
  if (payload.data) {
    if (Array.isArray(payload.data)) return payload.data;
    for (const k of keys) {
      if (Array.isArray(payload.data[k])) return payload.data[k];
    }
  }
  return [];
}

function normalizeAccount(raw: any): ZernioAccount {
  return {
    id:          pickString(raw.id, raw._id, raw.accountId, raw.account_id, raw.username) ?? Math.random().toString(36).slice(2),
    platform:    normalizePlatform(raw.platform ?? raw.network ?? raw.type),
    username:    pickString(raw.username, raw.handle, raw.name, raw.displayName) ?? 'Unknown',
    displayName: pickString(raw.displayName, raw.display_name, raw.name),
    avatarUrl:   pickString(raw.avatarUrl, raw.avatar_url, raw.avatar, raw.profile_image_url, raw.picture),
    followers:   pickNumber(raw.followers, raw.followers_count, raw.follower_count, raw.subscribers, raw.subscriber_count),
    following:   pickNumber(raw.following, raw.following_count),
    posts:       pickNumber(raw.posts, raw.posts_count, raw.media_count, raw.video_count),
    engagement:  pickNumber(raw.engagement, raw.engagement_rate, raw.avg_engagement),
    raw,
  };
}

function normalizePost(raw: any): ZernioPost {
  const platform = normalizePlatform(
    raw.platform ?? raw.network ?? (raw.platforms?.[0]?.platform),
  );
  const platformPost = raw.platforms?.[0] ?? {};
  return {
    id:           pickString(raw.id, raw._id, raw.postId, raw.post_id) ?? Math.random().toString(36).slice(2),
    platform,
    caption:      pickString(raw.caption, raw.content, raw.text, raw.title, raw.description),
    thumbnailUrl: pickString(raw.thumbnailUrl, raw.thumbnail_url, raw.mediaItems?.[0]?.url, raw.media?.[0]?.url),
    postUrl:      pickString(raw.postUrl, raw.url, raw.platform_post_url, platformPost.url),
    publishedAt:  pickString(raw.publishedAt, raw.published_at, raw.scheduledFor, raw.scheduled_for, raw.createdAt, raw.created_at),
    status:       pickString(raw.status, raw.state, platformPost.status),
    likes:        pickNumber(raw.likes, raw.like_count, raw.metrics?.likes, platformPost.likes),
    comments:     pickNumber(raw.comments, raw.comment_count, raw.metrics?.comments, platformPost.comments),
    shares:       pickNumber(raw.shares, raw.share_count, raw.metrics?.shares, platformPost.shares),
    views:        pickNumber(raw.views, raw.view_count, raw.impressions, raw.metrics?.views, platformPost.views),
    engagement:   pickNumber(raw.engagement, raw.engagement_rate, raw.metrics?.engagement),
    raw,
  };
}

async function safeFetch<T = any>(url: string): Promise<{ ok: boolean; data?: T; status?: number; error?: string }> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      let errBody: any = null;
      try { errBody = await res.json(); } catch { /* ignore */ }
      return { ok: false, status: res.status, error: errBody?.error || res.statusText };
    }
    const data = await res.json();
    return { ok: true, data, status: res.status };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function fetchZernioOverview(): Promise<ZernioAnalyticsSnapshot> {
  // First check if Zernio is configured at all
  const cfg = await safeFetch<{ hasKey: boolean }>('/api/zernio/config-check');
  if (!cfg.ok || !cfg.data?.hasKey) {
    return {
      configured: false,
      error: cfg.data?.hasKey === false
        ? 'Zernio API key not configured. Set ZERNIO_API_KEY in your environment.'
        : (cfg.error ?? 'Could not reach Zernio config endpoint.'),
      accounts: [],
      posts: [],
    };
  }

  const [accountsRes, postsRes, analyticsRes] = await Promise.all([
    safeFetch('/api/zernio/accounts'),
    safeFetch('/api/zernio/posts'),
    safeFetch('/api/zernio/analytics'),
  ]);

  const errors: string[] = [];
  if (!accountsRes.ok)  errors.push(`accounts: ${accountsRes.error ?? '—'}`);
  if (!postsRes.ok)     errors.push(`posts: ${postsRes.error ?? '—'}`);
  if (!analyticsRes.ok) errors.push(`analytics: ${analyticsRes.error ?? '—'}`);

  const rawAccounts = accountsRes.ok ? unwrapList(accountsRes.data, 'accounts', 'items', 'results') : [];
  const rawPosts    = postsRes.ok    ? unwrapList(postsRes.data,    'posts',    'items', 'results') : [];

  return {
    configured: true,
    error:      errors.length > 0 ? errors.join(' • ') : undefined,
    accounts:   rawAccounts.map(normalizeAccount),
    posts:      rawPosts.map(normalizePost),
    rawAnalytics: analyticsRes.ok ? analyticsRes.data : undefined,
    fetchedAt:  new Date().toISOString(),
  };
}
