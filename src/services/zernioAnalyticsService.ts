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
  endpointErrors?: string[];
  accounts: ZernioAccount[];
  posts: ZernioPost[];
  followerStats?: ZernioFollowerStats;
  dailyMetrics?: ZernioDailyMetrics;
  bestTime?: { slots: ZernioBestTimeSlot[] };
  contentDecay?: { buckets: ZernioContentDecayBucket[] };
  postingFrequency?: { frequency: ZernioPostingFrequencyRow[] };
  rawAnalytics?: any;
  fetchedAt?: string;
}

export interface ZernioFollowerAccount {
  _id: string;
  platform: string;
  username: string;
  currentFollowers: number;
  growth: number;
  growthPercentage: number;
  dataPoints: number;
}

export interface ZernioFollowerStats {
  accounts: ZernioFollowerAccount[];
  stats: Record<string, Array<{ date: string; followers: number }>>;
  dateRange: { from: string; to: string };
  granularity: string;
}

export interface ZernioDailyMetricsDay {
  date: string;
  postCount: number;
  platforms: Record<string, number>;
  metrics: {
    impressions: number; reach: number; likes: number; comments: number;
    shares: number; saves: number; clicks: number; views: number;
  };
}

export interface ZernioPlatformBreakdown {
  platform: string;
  postCount: number;
  impressions: number; reach: number; likes: number; comments: number;
  shares: number; saves: number; clicks: number; views: number;
}

export interface ZernioDailyMetrics {
  dailyData: ZernioDailyMetricsDay[];
  platformBreakdown: ZernioPlatformBreakdown[];
}

export interface ZernioBestTimeSlot {
  day_of_week: number; hour: number; avg_engagement: number; post_count: number;
}

export interface ZernioContentDecayBucket {
  bucket_order: number; bucket_label: string; avg_pct_of_final: number; post_count: number;
}

export interface ZernioPostingFrequencyRow {
  platform: string; posts_per_week: number; avg_engagement_rate: number;
  avg_engagement: number; weeks_count: number;
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
    const ct = res.headers.get('content-type') ?? '';
    // If Express isn't handling this path, Vite returns 200 OK with HTML.
    // Detect that early so we get a useful error instead of a JSON parse failure.
    if (ct.includes('text/html')) {
      if (import.meta.env.DEV) {
        console.error(`[safeFetch] ${url} → HTML response detected. Restart the dev server.`);
      }
      return { ok: false, status: res.status, error: 'Server returned HTML — API proxy not matched. Restart dev server.' };
    }
    if (!res.ok) {
      let errBody: any = null;
      try { errBody = await res.json(); } catch { /* ignore */ }
      return { ok: false, status: res.status, error: errBody?.error || errBody?.message || res.statusText };
    }
    const data = await res.json();
    return { ok: true, data, status: res.status };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Proxy GET to any Zernio v1 endpoint. Returns null on any error. */
async function zernioGet<T = any>(path: string, params?: Record<string, string>): Promise<T | null> {
  const qs = params && Object.keys(params).length > 0 ? '?' + new URLSearchParams(params).toString() : '';
  const res = await safeFetch<T>(`/api/zernio${path}${qs}`);
  return res.ok ? (res.data ?? null) : null;
}

// ── Individual endpoint exports ───────────────────────────────────────────────

export const fetchFollowerStats         = (params?: Record<string, string>) =>
  zernioGet<ZernioFollowerStats>('/accounts/follower-stats', params);

export const fetchDailyMetrics          = (params?: Record<string, string>) =>
  zernioGet<ZernioDailyMetrics>('/analytics/daily-metrics', params);

export const fetchBestTime              = () =>
  zernioGet<{ slots: ZernioBestTimeSlot[] }>('/analytics/best-time');

export const fetchContentDecay          = () =>
  zernioGet<{ buckets: ZernioContentDecayBucket[] }>('/analytics/content-decay');

export const fetchPostingFrequency      = () =>
  zernioGet<{ frequency: ZernioPostingFrequencyRow[] }>('/analytics/posting-frequency');

export const fetchPostAnalytics         = (postId?: string) =>
  zernioGet('/analytics', postId ? { postId } : undefined);

export const fetchPostTimeline          = (postId: string) =>
  zernioGet('/analytics/post-timeline', { postId });


export const fetchInstagramInsights     = (accountId: string, params?: Record<string, string>) =>
  zernioGet('/analytics/instagram/account-insights', { accountId, ...params });

export const fetchInstagramDemographics = (accountId: string) =>
  zernioGet('/analytics/instagram/demographics', { accountId });

export const fetchYouTubeDailyViews     = (videoId: string, accountId: string, params?: Record<string, string>) =>
  zernioGet('/analytics/youtube/daily-views', { videoId, accountId, ...params });

export const fetchYouTubeDemographics   = (accountId: string) =>
  zernioGet('/analytics/youtube/demographics', { accountId });

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

  // Default date range: last 30 days (most Zernio analytics endpoints require this)
  const dateTo   = new Date().toISOString().slice(0, 10);
  const dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const dateParams = `from=${dateFrom}&to=${dateTo}`;

  const [accountsRes, postsRes, analyticsRes, followerRes, dailyRes, bestTimeRes, decayRes, freqRes] = await Promise.all([
    safeFetch('/api/zernio/accounts'),
    safeFetch('/api/zernio/posts'),
    safeFetch('/api/zernio/analytics'),
    safeFetch<ZernioFollowerStats>(`/api/zernio/accounts/follower-stats?${dateParams}`),
    safeFetch<ZernioDailyMetrics>(`/api/zernio/analytics/daily-metrics?${dateParams}`),
    safeFetch<{ slots: ZernioBestTimeSlot[] }>(`/api/zernio/analytics/best-time?${dateParams}`),
    safeFetch<{ buckets: ZernioContentDecayBucket[] }>(`/api/zernio/analytics/content-decay?${dateParams}`),
    safeFetch<{ frequency: ZernioPostingFrequencyRow[] }>(`/api/zernio/analytics/posting-frequency?${dateParams}`),
  ]);

  const errors: string[] = [];
  if (!accountsRes.ok)  errors.push(`accounts: ${accountsRes.error ?? '—'}`);
  if (!postsRes.ok)     errors.push(`posts: ${postsRes.error ?? '—'}`);
  if (!analyticsRes.ok) errors.push(`analytics: ${analyticsRes.error ?? '—'}`);
  if (!followerRes.ok)  errors.push(`follower-stats: ${followerRes.error ?? '—'}`);
  if (!dailyRes.ok)     errors.push(`daily-metrics: ${dailyRes.error ?? '—'}`);
  if (!bestTimeRes.ok)  errors.push(`best-time: ${bestTimeRes.error ?? '—'}`);
  if (!decayRes.ok)     errors.push(`content-decay: ${decayRes.error ?? '—'}`);
  if (!freqRes.ok)      errors.push(`posting-frequency: ${freqRes.error ?? '—'}`);

  // Debug: log full result (data when ok, or status+error when failed) so we can diagnose
  const dbg = (name: string, r: { ok: boolean; data?: any; status?: number; error?: string }) =>
    console.debug(`[Zernio] ${name}:`, r.ok ? r.data : `HTTP ${r.status ?? '?'} — ${r.error ?? 'unknown error'}`);
  dbg('accounts', accountsRes);
  dbg('posts', postsRes);
  dbg('analytics', analyticsRes);
  dbg('follower-stats', followerRes);
  dbg('daily-metrics', dailyRes);
  dbg('best-time', bestTimeRes);
  dbg('content-decay', decayRes);
  dbg('posting-frequency', freqRes);

  const rawAccounts = accountsRes.ok ? unwrapList(accountsRes.data, 'accounts', 'items', 'results') : [];
  const rawPosts    = postsRes.ok    ? unwrapList(postsRes.data,    'posts',    'items', 'results') : [];

  // Enrich account objects with follower counts from follower-stats
  // (the /accounts endpoint does not include follower metrics; /accounts/follower-stats does)
  const followerByKey = new Map<string, ZernioFollowerAccount>();
  for (const fa of (followerRes.data?.accounts ?? [])) {
    followerByKey.set(`${fa.platform.toLowerCase()}:${fa.username.toLowerCase()}`, fa);
    followerByKey.set(fa.platform.toLowerCase(), fa); // fallback: first account of that platform
  }

  const normalizedAccounts = rawAccounts.map((raw: any) => {
    const acc = normalizeAccount(raw);
    if (acc.followers == null) {
      const fa =
        followerByKey.get(`${acc.platform.toLowerCase()}:${acc.username.toLowerCase()}`) ??
        followerByKey.get(acc.platform.toLowerCase());
      if (fa) {
        acc.followers = fa.currentFollowers;
        if (acc.engagement == null && fa.growthPercentage != null) {
          // use growth % as a proxy for the engagement field until real engagement arrives
          // (better than showing —)
        }
      }
    }
    return acc;
  });

  return {
    configured:       true,
    error:            errors.length > 0 ? errors.join(' • ') : undefined,
    endpointErrors:   errors.length > 0 ? errors : undefined,
    accounts:         normalizedAccounts,
    posts:            rawPosts.map(normalizePost),
    followerStats:    followerRes.ok   ? followerRes.data   : undefined,
    dailyMetrics:     dailyRes.ok      ? dailyRes.data      : undefined,
    bestTime:         bestTimeRes.ok   ? bestTimeRes.data   : undefined,
    contentDecay:     decayRes.ok      ? decayRes.data      : undefined,
    postingFrequency: freqRes.ok       ? freqRes.data       : undefined,
    rawAnalytics:     analyticsRes.ok  ? analyticsRes.data  : undefined,
    fetchedAt:        new Date().toISOString(),
  };
}
