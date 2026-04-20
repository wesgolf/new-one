import { emptyAnalyticsPayload, type AnalyticsProvider } from './baseProvider';
import type {
  AnalyticsDomainPayload,
  AnalyticsOverviewMetric,
  AnalyticsProviderState,
  PlatformSnapshot,
  PlatformStat,
} from '../../types/domain';
import { fetchArtistStats, type ArtistStatEntry } from '../../lib/songstatsService';

const artistId  = import.meta.env.VITE_SONGSTATS_ARTIST_ID as string | undefined;
const configured = !!artistId;

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

function stat(label: string, value: number | undefined, unit?: string): PlatformStat | null {
  if (value == null || isNaN(value)) return null;
  return { label, value, unit };
}

interface PlatformConfig {
  id: string;
  label: string;
  brandColor: string;
  category: 'streaming' | 'social' | 'dj';
  build: (data: Record<string, number>) => Omit<PlatformSnapshot, 'id' | 'label' | 'brandColor' | 'category'>;
}

const PLATFORM_CONFIGS: Record<string, PlatformConfig> = {
  spotify: {
    id: 'spotify', label: 'Spotify', brandColor: '#1DB954', category: 'streaming',
    build: (d) => ({
      primary: stat('Monthly Listeners', d.monthly_listeners_current),
      secondary: compact([
        stat('Followers', d.followers_total),
        stat('Total Streams', d.streams_total),
        stat('Popularity', d.popularity_current, '/100'),
      ]),
      audienceSize: (d.followers_total ?? 0) + (d.monthly_listeners_current ?? 0),
      chartsCount: d.charts_current,
      chartedTracks: d.charted_tracks_current,
      playlistReach: d.playlist_reach_current,
      editorialCount: d.playlists_editorial_current,
      totalPlaylists: d.playlists_current,
    }),
  },
  apple_music: {
    id: 'apple_music', label: 'Apple Music', brandColor: '#FA243C', category: 'streaming',
    build: (d) => ({
      primary: stat('Playlists', d.playlists_current),
      secondary: compact([
        stat('Editorial', d.playlists_editorial_current),
        stat('Charts', d.charts_current),
        stat('Charted Tracks', d.charted_tracks_current),
      ]),
      audienceSize: 0,
      chartsCount: d.charts_current,
      chartedTracks: d.charted_tracks_current,
      editorialCount: d.playlists_editorial_current,
      totalPlaylists: d.playlists_current,
    }),
  },
  youtube: {
    id: 'youtube', label: 'YouTube', brandColor: '#FF0000', category: 'social',
    build: (d) => ({
      primary: stat('Subscribers', d.subscribers_total),
      secondary: compact([
        stat('Video Views', d.video_views_total),
        stat('Channel Views', d.channel_views_total),
        stat('Shorts', d.shorts_total),
      ]),
      audienceSize: d.subscribers_total ?? 0,
      totalPlaylists: d.playlists_current,
    }),
  },
  instagram: {
    id: 'instagram', label: 'Instagram', brandColor: '#E1306C', category: 'social',
    build: (d) => ({
      primary: stat('Followers', d.followers_total),
      secondary: compact([
        stat('Engagement', d.engagement_rate_total, '%'),
        stat('Video Views', d.views_total),
      ]),
      audienceSize: d.followers_total ?? 0,
    }),
  },
  tiktok: {
    id: 'tiktok', label: 'TikTok', brandColor: '#000000', category: 'social',
    build: (d) => ({
      primary: stat('Followers', d.followers_total),
      secondary: compact([
        stat('Views', d.views_total),
        stat('Engagement', d.engagement_rate_total, '%'),
      ]),
      audienceSize: d.followers_total ?? 0,
    }),
  },
  soundcloud: {
    id: 'soundcloud', label: 'SoundCloud', brandColor: '#FF5500', category: 'streaming',
    build: (d) => ({
      primary: stat('Streams', d.streams_total),
      secondary: compact([
        stat('Followers', d.followers_total),
      ]),
      audienceSize: (d.followers_total ?? 0),
    }),
  },
  shazam: {
    id: 'shazam', label: 'Shazam', brandColor: '#0066FF', category: 'streaming',
    build: (d) => ({
      primary: stat('Total Shazams', d.shazams_total),
      secondary: compact([
        stat('Charts', d.charts_current),
        stat('Charted Tracks', d.charted_tracks_current),
      ]),
      audienceSize: 0,
      chartsCount: d.charts_current,
      chartedTracks: d.charted_tracks_current,
    }),
  },
  beatport: {
    id: 'beatport', label: 'Beatport', brandColor: '#00FF95', category: 'dj',
    build: (d) => ({
      primary: stat('DJ Charts', d.dj_charts_total),
      secondary: compact([
        stat('Top 100 Tracks', d.overall_top_100_charted_tracks_total),
        stat('Charted Tracks', d.charted_tracks_current),
      ]),
      audienceSize: 0,
      chartedTracks: d.charted_tracks_current,
    }),
  },
  traxsource: {
    id: 'traxsource', label: 'Traxsource', brandColor: '#14A44A', category: 'dj',
    build: (d) => ({
      primary: stat('DJ Charts', d.dj_charts_total),
      secondary: compact([
        stat('Charted Tracks', d.charted_tracks_current),
      ]),
      audienceSize: 0,
      chartedTracks: d.charted_tracks_current,
    }),
  },
  tracklist: {
    id: 'tracklist', label: '1001Tracklists', brandColor: '#FF6600', category: 'dj',
    build: (d) => ({
      primary: stat('Total Support', d.total_support_total),
      secondary: [],
      audienceSize: 0,
    }),
  },
  tidal: {
    id: 'tidal', label: 'Tidal', brandColor: '#0F0F0F', category: 'streaming',
    build: (d) => ({
      primary: stat('Popularity', d.popularity_current, '/100'),
      secondary: compact([
        stat('Playlists', d.playlists_current),
      ]),
      audienceSize: 0,
      totalPlaylists: d.playlists_current,
    }),
  },
  deezer: {
    id: 'deezer', label: 'Deezer', brandColor: '#00C7F2', category: 'streaming',
    build: (d) => ({
      primary: stat('Playlists', d.playlists_current),
      secondary: compact([
        stat('Playlist Reach', d.playlist_reach_current),
      ]),
      audienceSize: 0,
      playlistReach: d.playlist_reach_current,
      totalPlaylists: d.playlists_current,
    }),
  },
  facebook: {
    id: 'facebook', label: 'Facebook', brandColor: '#1877F2', category: 'social',
    build: (d) => ({
      primary: stat('Followers', d.followers_total),
      secondary: [],
      audienceSize: d.followers_total ?? 0,
    }),
  },
  twitter: {
    id: 'twitter', label: 'X (Twitter)', brandColor: '#0F0F0F', category: 'social',
    build: (d) => ({
      primary: stat('Followers', d.followers_total),
      secondary: [],
      audienceSize: d.followers_total ?? 0,
    }),
  },
};

function buildPlatforms(stats: ArtistStatEntry[]): PlatformSnapshot[] {
  const platforms: PlatformSnapshot[] = [];
  for (const entry of stats) {
    const cfg = PLATFORM_CONFIGS[entry.source];
    if (!cfg) continue;
    const built = cfg.build(entry.data || {});
    if (!built.primary && built.secondary.length === 0) continue;
    platforms.push({
      id: cfg.id,
      label: cfg.label,
      brandColor: cfg.brandColor,
      category: cfg.category,
      ...built,
    });
  }
  return platforms;
}

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

  const streaming = compact([
    metric('sp_streams',         'Spotify Streams',          sp.streams_total),
    metric('sp_monthly',         'Monthly Listeners',        sp.monthly_listeners_current),
    metric('sp_popularity',      'Spotify Popularity',       sp.popularity_current, '/100'),
    metric('sp_followers',       'Spotify Followers',        sp.followers_total),
    metric('sc_streams',         'SoundCloud Streams',       sc.streams_total),
    metric('sc_followers',       'SoundCloud Followers',     sc.followers_total),
    metric('td_popularity',      'Tidal Popularity',         td.popularity_current, '/100'),
    metric('sh_shazams',         'Shazam Total',             sh.shazams_total),
  ]);

  const playlist = compact([
    metric('sp_playlists',       'Spotify Playlists',        sp.playlists_current),
    metric('sp_pl_reach',        'Spotify Playlist Reach',   sp.playlist_reach_current),
    metric('sp_pl_editorial',    'Spotify Editorial',        sp.playlists_editorial_current),
    metric('am_playlists',       'Apple Music Playlists',    am.playlists_current),
    metric('am_editorial',       'Apple Music Editorial',    am.playlists_editorial_current),
    metric('dz_playlists',       'Deezer Playlists',         dz.playlists_current),
    metric('dz_pl_reach',        'Deezer Playlist Reach',    dz.playlist_reach_current),
    metric('yt_playlists',       'YouTube Playlists',        yt.playlists_current),
    metric('td_playlists',       'Tidal Playlists',          td.playlists_current),
    metric('bp_dj_charts',       'Beatport DJ Charts',       bp.dj_charts_total),
    metric('tx_dj_charts',       'Traxsource DJ Charts',     tx.dj_charts_total),
    metric('tl_support',         '1001Tracklists Support',   tl.total_support_total),
  ]);

  const social = compact([
    metric('ig_followers',       'Instagram Followers',      ig.followers_total),
    metric('ig_engagement',      'Instagram Engagement',     ig.engagement_rate_total, '%'),
    metric('ig_views',           'Instagram Video Views',    ig.views_total),
    metric('tk_followers',       'TikTok Followers',         tk.followers_total),
    metric('tk_views',           'TikTok Views',             tk.views_total),
    metric('tk_engagement',      'TikTok Engagement',        tk.engagement_rate_total, '%'),
    metric('yt_subscribers',     'YouTube Subscribers',      yt.subscribers_total),
    metric('yt_views',           'YouTube Video Views',      yt.video_views_total),
    metric('yt_channel_views',   'YouTube Channel Views',    yt.channel_views_total),
    metric('fb_followers',       'Facebook Followers',       fb.followers_total),
    metric('tw_followers',       'Twitter Followers',        tw.followers_total),
  ]);

  const audience = compact([
    metric('am_charts',          'Apple Music Charts',       am.charts_current),
    metric('am_charted_tracks',  'Apple Charted Tracks',     am.charted_tracks_current),
    metric('sh_charts',          'Shazam Charts',            sh.charts_current),
    metric('sh_charted',         'Shazam Charted Tracks',    sh.charted_tracks_current),
    metric('bp_charted',         'Beatport Charted Tracks',  bp.charted_tracks_current),
    metric('tx_charted',         'Traxsource Charted',       tx.charted_tracks_current),
  ]);

  const releases = compact([
    metric('sp_charts',          'Spotify Charts',           sp.charts_current),
    metric('sp_charted_tracks',  'Spotify Charted Tracks',   sp.charted_tracks_current),
    metric('yt_shorts',          'YouTube Shorts',           yt.shorts_total),
    metric('bp_top100',          'Beatport Top 100',         bp.overall_top_100_charted_tracks_total),
  ]);

  const platforms = buildPlatforms(stats);

  return { streaming, playlist, social, audience, releases, platforms };
}

export const songstatsProvider: AnalyticsProvider = {
  id: 'songstats',
  label: 'Songstats',

  async load(): Promise<AnalyticsDomainPayload> {
    if (!configured) return emptyAnalyticsPayload('songstats');
    const res = await fetchArtistStats(artistId!);
    return mapStats(res.stats);
  },

  async getState(): Promise<AnalyticsProviderState> {
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
