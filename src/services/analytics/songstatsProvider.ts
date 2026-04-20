import { emptyAnalyticsPayload, type AnalyticsProvider } from './baseProvider';
import type { AnalyticsDomainPayload, AnalyticsOverviewMetric, AnalyticsProviderState } from '../../types/domain';
import { fetchArtistStats, type ArtistStatEntry } from '../../lib/songstatsService';

const apiKey    = import.meta.env.VITE_SONGSTATS_API_KEY  as string | undefined;
const artistId  = import.meta.env.VITE_SONGSTATS_ARTIST_ID as string | undefined;
const configured = !!apiKey && !!artistId;

// ── Helper: turn a numeric field into a metric card ──────────────────────────

function metric(
  id: string,
  label: string,
  value: number | undefined,
  unit?: string,
): AnalyticsOverviewMetric | null {
  if (value == null || isNaN(value)) return null;
  return { id, label, value, unit, sourceProvider: 'Songstats' };
}

function compact<T>(arr: (T | null)[]): T[] {
  return arr.filter((x): x is T => x !== null);
}

// ── Map /artists/stats → AnalyticsDomainPayload ───────────────────────────────

function mapStats(stats: ArtistStatEntry[]): AnalyticsDomainPayload {
  const bySource: Record<string, Record<string, number>> = {};
  for (const entry of stats) bySource[entry.source] = entry.data;

  const sp  = bySource['spotify']     ?? {};
  const am  = bySource['apple_music'] ?? {};
  const yt  = bySource['youtube']     ?? {};
  const ig  = bySource['instagram']   ?? {};
  const tk  = bySource['tiktok']      ?? {};
  const sc  = bySource['soundcloud']  ?? {};
  const sh  = bySource['shazam']      ?? {};
  const bp  = bySource['beatport']    ?? {};
  const tx  = bySource['traxsource']  ?? {};
  const dz  = bySource['deezer']      ?? {};
  const fb  = bySource['facebook']    ?? {};
  const tw  = bySource['twitter']     ?? {};
  const tl  = bySource['tracklist']   ?? {};
  const td  = bySource['tidal']       ?? {};

  // ── STREAMING ──────────────────────────────────────────────────────────────
  const streaming = compact([
    metric('sp_streams',         'Spotify Streams',          sp.streams_total,             ''),
    metric('sp_monthly',         'Monthly Listeners',        sp.monthly_listeners_current, ''),
    metric('sp_popularity',      'Spotify Popularity',       sp.popularity_current,        '/100'),
    metric('sp_followers',       'Spotify Followers',        sp.followers_total,           ''),
    metric('sc_streams',         'SoundCloud Streams',       sc.streams_total,             ''),
    metric('sc_followers',       'SoundCloud Followers',     sc.followers_total,           ''),
    metric('td_popularity',      'Tidal Popularity',         td.popularity_current,        '/100'),
    metric('sh_shazams',         'Shazam Total',             sh.shazams_total,             ''),
  ]);

  // ── PLAYLISTING ────────────────────────────────────────────────────────────
  const playlist = compact([
    metric('sp_playlists',       'Spotify Playlists',        sp.playlists_current,         ''),
    metric('sp_pl_reach',        'Spotify Playlist Reach',   sp.playlist_reach_current,    ''),
    metric('sp_pl_editorial',    'Spotify Editorial',        sp.playlists_editorial_current,''),
    metric('am_playlists',       'Apple Music Playlists',    am.playlists_current,         ''),
    metric('am_editorial',       'Apple Music Editorial',    am.playlists_editorial_current,''),
    metric('dz_playlists',       'Deezer Playlists',         dz.playlists_current,         ''),
    metric('dz_pl_reach',        'Deezer Playlist Reach',    dz.playlist_reach_current,    ''),
    metric('yt_playlists',       'YouTube Playlists',        yt.playlists_current,         ''),
    metric('td_playlists',       'Tidal Playlists',          td.playlists_current,         ''),
    metric('bp_dj_charts',       'Beatport DJ Charts',       bp.dj_charts_total,           ''),
    metric('tx_dj_charts',       'Traxsource DJ Charts',     tx.dj_charts_total,           ''),
    metric('tl_support',         '1001Tracklists Support',   tl.total_support_total,       ''),
  ]);

  // ── SOCIAL ─────────────────────────────────────────────────────────────────
  const social = compact([
    metric('ig_followers',       'Instagram Followers',      ig.followers_total,           ''),
    metric('ig_engagement',      'Instagram Engagement',     ig.engagement_rate_total,     '%'),
    metric('ig_views',           'Instagram Video Views',    ig.views_total,               ''),
    metric('tk_followers',       'TikTok Followers',         tk.followers_total,           ''),
    metric('tk_views',           'TikTok Views',             tk.views_total,               ''),
    metric('tk_engagement',      'TikTok Engagement',        tk.engagement_rate_total,     '%'),
    metric('yt_subscribers',     'YouTube Subscribers',      yt.subscribers_total,         ''),
    metric('yt_views',           'YouTube Video Views',      yt.video_views_total,         ''),
    metric('yt_channel_views',   'YouTube Channel Views',    yt.channel_views_total,       ''),
    metric('fb_followers',       'Facebook Followers',       fb.followers_total,           ''),
    metric('tw_followers',       'Twitter Followers',        tw.followers_total,           ''),
  ]);

  // ── AUDIENCE ───────────────────────────────────────────────────────────────
  const audience = compact([
    metric('am_charts',          'Apple Music Charts',       am.charts_current,            ''),
    metric('am_charted_tracks',  'Apple Charted Tracks',     am.charted_tracks_current,    ''),
    metric('sh_charts',          'Shazam Charts',            sh.charts_current,            ''),
    metric('sh_charted',         'Shazam Charted Tracks',    sh.charted_tracks_current,    ''),
    metric('bp_charted',         'Beatport Charted Tracks',  bp.charted_tracks_current,    ''),
    metric('tx_charted',         'Traxsource Charted',       tx.charted_tracks_current,    ''),
  ]);

  // ── RELEASES ───────────────────────────────────────────────────────────────
  const releases = compact([
    metric('sp_charts',          'Spotify Charts',           sp.charts_current,            ''),
    metric('sp_charted_tracks',  'Spotify Charted Tracks',   sp.charted_tracks_current,    ''),
    metric('yt_shorts',          'YouTube Shorts',           yt.shorts_total,              ''),
    metric('bp_top100',          'Beatport Top 100',         bp.overall_top_100_charted_tracks_total, ''),
  ]);

  return { streaming, playlist, social, audience, releases };
}

// ── Provider ──────────────────────────────────────────────────────────────────

export const songstatsProvider: AnalyticsProvider = {
  id: 'songstats',
  label: 'Songstats',

  async load(): Promise<AnalyticsDomainPayload> {
    if (!configured) return emptyAnalyticsPayload('songstats');
    const res = await fetchArtistStats(artistId!);
    return mapStats(res.stats);
  },

  async getState(): Promise<AnalyticsProviderState> {
    if (!apiKey) {
      return {
        provider: 'Songstats',
        status: 'not_configured',
        errorMessage: 'Set VITE_SONGSTATS_API_KEY in .env to enable Songstats.',
      };
    }
    if (!artistId) {
      return {
        provider: 'Songstats',
        status: 'not_configured',
        errorMessage: 'Set VITE_SONGSTATS_ARTIST_ID in .env (your Songstats artist ID).',
      };
    }
    try {
      const res = await fetchArtistStats(artistId);
      return {
        provider: 'Songstats',
        status: 'ready',
        lastSyncedAt: new Date().toISOString(),
        errorMessage: `${res.stats.length} platform(s) returned.`,
      };
    } catch (err) {
      return {
        provider: 'Songstats',
        status: 'error',
        errorMessage: err instanceof Error ? err.message : 'Unknown Songstats error.',
      };
    }
  },
};

