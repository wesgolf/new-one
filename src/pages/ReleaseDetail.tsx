import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Disc3,
  Edit2,
  ExternalLink,
  FileAudio,
  Layers,
  ListMusic,
  Loader2,
  Music2,
  Pencil,
  Rocket,
  Save,
  Share2,
  TrendingUp,
  RefreshCw,
  Users,
  Megaphone,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { useSongstatsTrackStats } from '../hooks/useSongstatsTrackStats';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { fetchReleaseById, fetchReleaseSnapshots, saveReleaseMetadata } from '../lib/supabaseData';
import { useCurrentUserRole } from '../hooks/useCurrentUserRole';
import { ReleaseFormModal } from '../components/ReleaseFormModal';
import type { ReleaseRecord } from '../types/domain';

// ── Helpers ───────────────────────────────────────────────────────────────────

function spotifyUrl(id: string | null | undefined) {
  return id ? `https://open.spotify.com/track/${id}` : null;
}

function soundcloudUrl(idOrUrl: string | null | undefined) {
  if (!idOrUrl) return null;
  // Already a full URL — use as-is
  if (idOrUrl.startsWith('http')) return idOrUrl;
  // Numeric ID: construct API/resolve URL via SoundCloud permalink format isn't possible
  // without the username. Fall back to profile page with the track slug if it looks like a slug.
  const SOUNDCLOUD_PROFILE = import.meta.env.VITE_SOUNDCLOUD_URL ?? 'https://soundcloud.com/wesmusic1';
  const base = SOUNDCLOUD_PROFILE.replace(/\/$/, '');
  return `${base}/${idOrUrl}`;
}

function fmtDate(d: string | null | undefined) {
  if (!d) return 'TBD';
  return new Date(d).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MetaChip({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3.5 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-1.5 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function IsrcChip({ isrc }: { isrc: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(isrc).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={copy}
      className="group flex items-center gap-2 rounded-2xl border border-slate-100 bg-white px-4 py-3.5 shadow-sm transition-colors hover:border-blue-200 hover:bg-blue-50"
    >
      <div>
        <p className="text-left text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">ISRC</p>
        <p className="mt-1.5 font-mono text-sm font-semibold text-slate-900">{isrc}</p>
      </div>
      {copied
        ? <Check className="ml-auto h-3.5 w-3.5 shrink-0 text-emerald-500" />
        : <Copy className="ml-auto h-3.5 w-3.5 shrink-0 text-slate-300 group-hover:text-blue-400" />
      }
    </button>
  );
}

interface StreamingLinkProps {
  label: string;
  href: string;
  color: string;
  icon: React.ReactNode;
}

function StreamingLink({ label, href, color, icon }: StreamingLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'group flex items-center gap-3 rounded-2xl border px-4 py-3.5 transition-all hover:-translate-y-0.5 hover:shadow-md',
        color,
      )}
    >
      <span className="text-xl">{icon}</span>
      <span className="text-sm font-semibold">{label}</span>
      <ExternalLink className="ml-auto h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
    </a>
  );
}

// ═══ Status badge ─────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  released:   'border-emerald-100 bg-emerald-50 text-emerald-700',
  scheduled:  'border-orange-100 bg-orange-50  text-orange-600',
  unreleased: 'border-slate-200  bg-slate-100  text-slate-600',
};

function statusBadge(s: string | null | undefined) {
  const key = s === 'scheduled' ? 'scheduled' : s === 'released' ? 'released' : 'unreleased';
  return STATUS_BADGE[key];
}

function statusLabel(s: string | null | undefined) {
  if (s === 'released') return 'Released';
  if (s === 'scheduled') return 'Scheduled';
  return 'Unreleased';
}

// ── Track Stats Panel (Songstats) ────────────────────────────────────────────

function metricCount(values: Array<number | null | undefined>) {
  return values.reduce((sum, value) => sum + (Number(value ?? 0) || 0), 0);
}

function hasAnyMetric(metrics: Record<string, number | null | undefined>) {
  return Object.values(metrics).some((value) => Number(value ?? 0) > 0);
}

function fmt(n: number | undefined): string {
  if (n == null || isNaN(n)) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function TrackStatsPanel({ release }: { release: ReleaseRecord }) {
  const releaseStreams = release.performance?.streams ?? {};
  const hasSpotify = Boolean(release.distribution?.spotify_url || release.spotify_track_id || Number(releaseStreams.spotify ?? 0) > 0);
  const hasApple = Boolean(release.distribution?.apple_music_url || Number(releaseStreams.apple ?? 0) > 0);
  const hasSoundCloud = Boolean(
    release.distribution?.soundcloud_url ||
    release.soundcloud_track_id ||
    Number(releaseStreams.soundcloud ?? 0) > 0 ||
    hasAnyMetric(release.soundcloud_stats as Record<string, number> ?? {}),
  );
  const hasYouTube = Boolean(
    release.distribution?.youtube_url ||
    Number(releaseStreams.youtube ?? 0) > 0 ||
    hasAnyMetric(release.youtube_stats as Record<string, number> ?? {}),
  );
  const isJointRelease = hasSpotify || hasApple;
  const isDirectOnlyRelease = !isJointRelease && (hasSoundCloud || hasYouTube);
  const { stats, songstatsTrackId: resolvedId, loading, error } = useSongstatsTrackStats(
    release.title,
    release.isrc,
    release.songstats_track_id,
    isJointRelease,
  );
  const bySource: Record<string, Record<string, number>> = {};
  for (const entry of stats?.stats ?? []) {
    bySource[entry.source.toLowerCase()] = entry.data;
  }

  const scData = {
    plays: release.soundcloud_stats?.plays ?? (Number(releaseStreams.soundcloud ?? 0) || null),
    likes: release.soundcloud_stats?.likes ?? null,
    reposts: release.soundcloud_stats?.reposts ?? null,
    comments: release.soundcloud_stats?.comments ?? null,
  };
  const ytData = {
    views: release.youtube_stats?.views ?? release.performance?.youtube_stats?.views ?? (Number(releaseStreams.youtube ?? 0) || null),
    likes: release.youtube_stats?.likes ?? release.performance?.youtube_stats?.likes ?? null,
    comments: release.youtube_stats?.comments ?? release.performance?.youtube_stats?.comments ?? null,
  };

  const spotifyMetrics = {
    streams: bySource.spotify?.streams_total ?? (Number(releaseStreams.spotify ?? 0) || null),
    saves: bySource.spotify?.saves_total ?? null,
    playlists: bySource.spotify?.playlist_count_current ?? null,
    playlistReach: bySource.spotify?.playlist_reach_current ?? null,
  };
  const appleMetrics = {
    streams: bySource.apple_music?.streams_total ?? (Number(releaseStreams.apple ?? 0) || null),
    playlists: bySource.apple_music?.playlists_current ?? null,
    editorial: bySource.apple_music?.playlists_editorial_current ?? null,
  };

  const platformTabs = [
    isJointRelease ? { id: 'overview', label: 'Overview' } : null,
    hasSpotify ? { id: 'spotify', label: 'Spotify' } : null,
    hasApple ? { id: 'apple_music', label: 'Apple Music' } : null,
    hasSoundCloud ? { id: 'soundcloud', label: 'SoundCloud' } : null,
    hasYouTube ? { id: 'youtube', label: 'YouTube' } : null,
  ].filter(Boolean) as Array<{ id: string; label: string }>;

  const [activeTab, setActiveTab] = useState<string>(isJointRelease ? 'overview' : (platformTabs[0]?.id ?? 'overview'));

  useEffect(() => {
    if (!platformTabs.some((tab) => tab.id === activeTab)) {
      setActiveTab(isJointRelease ? 'overview' : (platformTabs[0]?.id ?? 'overview'));
    }
  }, [activeTab, isJointRelease, platformTabs]);

  const totalTrustedStreams = metricCount([
    spotifyMetrics.streams,
    appleMetrics.streams,
    scData.plays,
    ytData.views,
  ]);

  const serviceCount = [hasSpotify, hasApple, hasSoundCloud, hasYouTube].filter(Boolean).length;

  const renderMetricGrid = (metrics: Array<{ label: string; value: number | null | undefined }>, columns = 'sm:grid-cols-4') => {
    const nonEmpty = metrics.filter((metric) => Number(metric.value ?? 0) > 0);
    if (!nonEmpty.length) {
      return <p className="text-xs text-slate-400">No trusted metrics stored for this service yet.</p>;
    }
    return (
      <div className={cn('grid grid-cols-2 gap-3', columns)}>
        {nonEmpty.map((metric) => (
          <div key={metric.label} className="rounded-2xl border border-white/60 bg-white/70 px-4 py-3 shadow-sm">
            <p className="text-lg font-bold text-slate-900 tabular-nums">{fmt(metric.value ?? undefined)}</p>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{metric.label}</p>
          </div>
        ))}
      </div>
    );
  };

  const renderServiceCard = (options: {
    icon: string;
    label: string;
    source: string;
    color: string;
    bg: string;
    href?: string | null;
    metrics: Array<{ label: string; value: number | null | undefined }>;
    note?: string | null;
  }) => (
    <div className={cn('rounded-[1.75rem] border border-slate-200 p-5 shadow-sm', options.bg)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className={cn('text-[10px] font-black uppercase tracking-[0.22em]', options.color)}>
            {options.icon} {options.label}
          </p>
          <p className="mt-2 text-xs font-medium text-slate-500">{options.source}</p>
        </div>
        {options.href ? (
          <a
            href={options.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition-colors hover:text-slate-900"
          >
            Open link
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ) : null}
      </div>
      <div className="mt-4">
        {renderMetricGrid(options.metrics, 'sm:grid-cols-3')}
      </div>
      {options.note ? <p className="mt-3 text-xs text-slate-400">{options.note}</p> : null}
    </div>
  );

  const renderOverview = () => (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Cumulative Streams</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{fmt(totalTrustedStreams)}</p>
          <p className="mt-1 text-xs text-slate-500">Spotify, Apple, SoundCloud, YouTube</p>
        </div>
        <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">SoundCloud Likes</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{fmt(scData.likes ?? undefined)}</p>
          <p className="mt-1 text-xs text-slate-500">Direct SoundCloud engagement</p>
        </div>
        <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">YouTube Likes</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{fmt(ytData.likes ?? undefined)}</p>
          <p className="mt-1 text-xs text-slate-500">Direct YouTube engagement</p>
        </div>
        <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Active Services</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{serviceCount}</p>
          <p className="mt-1 text-xs text-slate-500">Trusted platform sources</p>
        </div>
      </div>

    </div>
  );

  const contentForTab = () => {
    if (activeTab === 'overview') return renderOverview();
    if (activeTab === 'spotify') {
      return renderServiceCard({
        icon: '🎵',
        label: 'Spotify',
        source: resolvedId ? 'Songstats matched DSP data' : 'Stored release totals',
        color: 'text-[#1DB954]',
        bg: 'bg-[#1DB954]/8',
        href: release.distribution?.spotify_url ?? spotifyUrl(release.spotify_track_id) ?? null,
        metrics: [
          { label: 'Streams', value: spotifyMetrics.streams },
          { label: 'Saves', value: spotifyMetrics.saves },
          { label: 'Playlists', value: spotifyMetrics.playlists },
          { label: 'Playlist Reach', value: spotifyMetrics.playlistReach },
        ],
        note: !resolvedId ? 'Run a Songstats pull to enrich Spotify breakdown beyond stored stream totals.' : null,
      });
    }
    if (activeTab === 'apple_music') {
      return renderServiceCard({
        icon: '🎶',
        label: 'Apple Music',
        source: resolvedId ? 'Songstats matched DSP data' : 'Stored release totals',
        color: 'text-[#FA243C]',
        bg: 'bg-[#FA243C]/8',
        href: release.distribution?.apple_music_url ?? null,
        metrics: [
          { label: 'Streams', value: appleMetrics.streams },
          { label: 'Playlists', value: appleMetrics.playlists },
          { label: 'Editorial', value: appleMetrics.editorial },
        ],
        note: !resolvedId ? 'Run a Songstats pull to enrich Apple Music breakdown beyond stored stream totals.' : null,
      });
    }
    if (activeTab === 'soundcloud') {
      return renderServiceCard({
        icon: '🔊',
        label: 'SoundCloud',
        source: 'Direct SoundCloud release data',
        color: 'text-[#FF5500]',
        bg: 'bg-[#FF5500]/8',
        href: release.distribution?.soundcloud_url ?? soundcloudUrl(release.soundcloud_track_id) ?? null,
        metrics: [
          { label: 'Plays', value: scData.plays },
          { label: 'Likes', value: scData.likes },
          { label: 'Reposts', value: scData.reposts },
          { label: 'Comments', value: scData.comments },
        ],
      });
    }
    if (activeTab === 'youtube') {
      return renderServiceCard({
        icon: '▶️',
        label: 'YouTube',
        source: 'Direct YouTube/Zernio data',
        color: 'text-[#FF0000]',
        bg: 'bg-[#FF0000]/8',
        href: release.distribution?.youtube_url ?? null,
        metrics: [
          { label: 'Views', value: ytData.views },
          { label: 'Likes', value: ytData.likes },
          { label: 'Comments', value: ytData.comments },
        ],
        note: ytData.likes == null && ytData.comments == null
          ? 'Only top-line YouTube views are stored for this release right now.'
          : null,
      });
    }
    return null;
  };

  if (!platformTabs.length) {
    return (
      <p className="mt-4 text-xs text-slate-400">
        No track analytics have been stored for this release yet.
      </p>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      {loading && isJointRelease ? (
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading Songstats breakdown for Spotify and Apple Music…
        </div>
      ) : null}

      {error && isJointRelease ? (
        <p className="text-xs text-rose-400">
          Songstats detail could not be loaded: {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {platformTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors',
              activeTab === tab.id
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isDirectOnlyRelease ? (
        <p className="text-xs text-slate-500">
          This release is being treated as a SoundCloud / YouTube-only release, so only direct platform data is rendered here.
        </p>
      ) : null}

      {contentForTab()}

      {resolvedId && isJointRelease ? (
        <a
          href={stats?.track_info?.site_url ?? `https://songstats.com/track/${resolvedId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-400 transition-colors hover:text-blue-500"
        >
          <ExternalLink className="h-3 w-3" />
          View full DSP report on Songstats
        </a>
      ) : null}
    </div>
  );
}

// ── Future-ready placeholder card ─────────────────────────────────────────────

function FuturePlaceholder({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col rounded-[2rem] border border-dashed border-slate-200 bg-slate-50/60 p-6">
      <div className="flex items-center gap-2.5">
        <span className="text-slate-400">{icon}</span>
        <h3 className="text-sm font-semibold text-slate-600">{title}</h3>
        <span className="ml-auto rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-slate-400">
          Coming soon
        </span>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-400">{description}</p>
    </div>
  );
}

// ── Chartmetric intel panel ───────────────────────────────────────────────────

interface CmData {
  cm_track_id?: number | null;
  name?: string | null;
  isrc?: string | null;
  upc?: string | null;
  label_name?: string | null;
  release_date?: string | null;
  genres?: string[] | null;
  moods?: string[] | null;
  tags?: string | null;
  explicit?: boolean;
  duration_ms?: number | null;
  songwriters?: string[] | null;
  career_health?: string | null;
  track_stage?: string | null;
  image_url?: string | null;
  sp_streams?: number | null;
  sp_popularity?: number | null;
  num_sp_playlists?: number | null;
  num_sp_editorial_playlists?: number | null;
  sp_playlist_total_reach?: number | null;
  num_am_playlists?: number | null;
  num_de_playlists?: number | null;
  num_yt_playlists?: number | null;
  num_az_playlists?: number | null;
  shazam_counts?: number | null;
  soundcloud_plays?: number | null;
  youtube_views?: number | null;
  youtube_likes?: number | null;
  tiktok_counts?: number | null;
  tiktok_top_videos_views?: number | null;
  tiktok_top_videos_likes?: number | null;
  genius_page_views?: number | null;
  pandora_lifetime_streams?: number | null;
  airplay_streams?: number | null;
  tidal_popularity?: number | null;
  score?: number | null;
  monthly_diff?: Record<string, number | null> | null;
  monthly_diff_percent?: Record<string, number | null> | null;
  weekly_diff?: Record<string, number | null> | null;
}

interface CmIds {
  isrc?: string | null;
  spotify_ids?: string[] | null;
  itunes_ids?: string[] | null;
  shazam_ids?: string[] | null;
  youtube_ids?: string[] | null;
  soundcloud_ids?: string[] | null;
  tiktok_ids?: string[] | null;
  deezer_ids?: string[] | null;
  amazon_ids?: string[] | null;
  beatport_ids?: string[] | null;
  chartmetric_ids?: number[] | null;
}

function fmtDiff(n: number | null | undefined, suffix = '') {
  if (n == null || n === 0) return null;
  const s = fmt(Math.abs(n));
  return n > 0 ? `+${s}${suffix}` : `-${s}${suffix}`;
}

function DiffBadge({ value, suffix = '' }: { value: number | null | undefined; suffix?: string }) {
  if (value == null || value === 0) return null;
  const positive = value > 0;
  return (
    <span className={cn(
      'ml-1 rounded-md px-1.5 py-0.5 text-[9px] font-bold',
      positive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700',
    )}>
      {positive ? '+' : ''}{suffix ? `${value.toFixed(1)}${suffix}` : fmtDiff(value) ?? ''}
    </span>
  );
}

function CmStatCard({
  label,
  value,
  diff,
  diffPct,
  color = 'text-slate-900',
}: {
  label: string;
  value: number | null | undefined;
  diff?: number | null;
  diffPct?: number | null;
  color?: string;
}) {
  if (value == null) return null;
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <p className={cn('text-xl font-bold tabular-nums', color)}>{fmt(value)}</p>
      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      {(diff != null || diffPct != null) && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          {diff != null && diff !== 0 && <DiffBadge value={diff} />}
          {diffPct != null && diffPct !== 0 && <DiffBadge value={diffPct} suffix="%" />}
        </div>
      )}
    </div>
  );
}

function ChartmetricStatsSeries({ cmId, platform, type, label, color }: {
  cmId: number;
  platform: string;
  type?: string;
  label: string;
  color: string;
}) {
  const [data, setData] = useState<Array<{ date: string; value: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams({ platform });
    if (type) params.set('type', type);
    fetch(`/api/chartmetric/track/${cmId}/stats?${params}`)
      .then((r) => r.json())
      .then((d) => {
        const pts = (d.series?.data ?? []) as Array<{ timestp: string; value: number }>;
        setData(pts.map((p) => ({
          date: format(new Date(p.timestp), 'MMM d yy'),
          value: p.value ?? 0,
        })));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [cmId, platform, type]);

  if (loading) return <div className="flex h-28 items-center justify-center"><Loader2 className="h-4 w-4 animate-spin text-slate-300" /></div>;
  if (data.length < 2) return <p className="py-4 text-center text-xs text-slate-400">Not enough data points yet.</p>;

  const gradId = `grad-${platform}-${type ?? 'default'}`;
  return (
    <div>
      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest" style={{ color }}>{label}</p>
      <ResponsiveContainer width="100%" height={120}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.18} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94a3b8' }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} />
          <Tooltip contentStyle={{ fontSize: 11, borderRadius: 10, border: '1px solid #e2e8f0' }} />
          <Area type="monotone" dataKey="value" stroke={color} fill={`url(#${gradId})`} strokeWidth={2} dot={false} name={label} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function ChartmetricPlaylists({ cmId }: { cmId: number }) {
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/chartmetric/track/${cmId}/playlists`)
      .then((r) => r.json())
      .then((d) => setPlaylists(d.playlists ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [cmId]);

  if (loading) return <div className="flex items-center gap-2 text-xs text-slate-400"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading playlists…</div>;

  if (!playlists.length) return <p className="text-xs text-slate-400">Not currently on any tracked playlists.</p>;

  return (
    <ul className="space-y-2">
      {playlists.map((entry: any, i: number) => {
        const pl = entry.playlist ?? entry;
        return (
          <li key={i} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-2.5">
            {pl.image_url && <img src={pl.image_url} alt="" className="h-9 w-9 flex-shrink-0 rounded-lg object-cover" />}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-800">{pl.name}</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                {pl.owner_name && <span>{pl.owner_name}</span>}
                {pl.followers != null && <span>· {fmt(pl.followers)} followers</span>}
                {pl.editorial && <span className="rounded-md bg-purple-100 px-1.5 py-0.5 text-[9px] font-bold text-purple-600">editorial</span>}
                {pl.position != null && <span>· pos #{pl.position}</span>}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function ChartmetricPanel({ release }: { release: ReleaseRecord }) {
  const [cm, setCm] = useState<CmData | null>(null);
  const [ids, setIds] = useState<CmIds | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'charts' | 'playlists' | 'ids'>('overview');

  const stored = (release as any).chartmetric_data as CmData | null | undefined;

  useEffect(() => {
    const isrc = release.isrc;
    // If we have synced data that's less than 24h old, use it directly — no live call needed
    if (stored?.cm_track_id) {
      const syncedAt = (stored as any).synced_at;
      const ageMs = syncedAt ? Date.now() - new Date(syncedAt).getTime() : Infinity;
      if (ageMs < 24 * 60 * 60 * 1000) {
        setCm(stored as CmData);
        return;
      }
    }
    if (!isrc) return;
    setLoading(true);
    fetch(`/api/chartmetric/track?isrc=${encodeURIComponent(isrc)}`)
      .then((r) => r.json())
      .then((d) => { if (d.track) setCm(d.track); else if (stored) setCm(stored as CmData); })
      .catch(() => { if (stored) setCm(stored as CmData); })
      .finally(() => setLoading(false));
  }, [release.isrc, stored?.cm_track_id]);

  useEffect(() => {
    const cmId = cm?.cm_track_id;
    if (!cmId) return;
    fetch(`/api/chartmetric/track/${cmId}/ids`)
      .then((r) => r.json())
      .then((d) => { if (d.ids) setIds(d.ids); })
      .catch(() => {});
  }, [cm?.cm_track_id]);

  const data = cm ?? (stored as CmData | null | undefined);

  if (!release.isrc && !stored) return null;

  const healthColor: Record<string, string> = {
    rising:   'text-emerald-600 bg-emerald-50 border-emerald-200',
    steady:   'text-blue-600 bg-blue-50 border-blue-200',
    declining:'text-rose-600 bg-rose-50 border-rose-200',
  };

  const md = data?.monthly_diff ?? {};
  const mdp = data?.monthly_diff_percent ?? {};

  const TABS: Array<{ id: typeof activeTab; label: string }> = [
    { id: 'overview',  label: 'Overview' },
    { id: 'charts',    label: 'Trend charts' },
    { id: 'playlists', label: 'Playlists' },
    { id: 'ids',       label: 'Platform IDs' },
  ];

  return (
    <section className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2.5">
        <TrendingUp className="h-4.5 w-4.5 text-slate-400" />
        <h2 className="text-base font-bold text-slate-900">Chartmetric intel</h2>
        <span className="ml-auto rounded-lg border border-purple-100 bg-purple-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-purple-600">
          via Chartmetric
        </span>
      </div>

      {loading && !data && (
        <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      )}

      {!loading && !data && (
        <p className="mt-4 text-xs text-slate-400">
          {release.isrc ? 'No Chartmetric match found for this ISRC.' : 'Add an ISRC to enable Chartmetric enrichment.'}
        </p>
      )}

      {data && (
        <div className="mt-4 space-y-4">
          {/* Badges row */}
          <div className="flex flex-wrap gap-2">
            {data.career_health && (
              <span className={cn('rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest', healthColor[data.career_health.toLowerCase()] ?? 'text-slate-600 bg-slate-50 border-slate-200')}>
                {data.career_health}
              </span>
            )}
            {data.track_stage && (
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                {data.track_stage}
              </span>
            )}
            {(data.genres ?? []).map((g) => (
              <span key={g} className="rounded-full border border-purple-100 bg-purple-50 px-3 py-1 text-[10px] font-semibold text-purple-600">{g}</span>
            ))}
            {(data.moods ?? []).slice(0, 3).map((m) => (
              <span key={m} className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[10px] font-semibold text-blue-600">{m}</span>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap gap-1.5">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors',
                  activeTab === tab.id
                    ? 'border-purple-600 bg-purple-600 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Overview tab */}
          {activeTab === 'overview' && (
            <div className="space-y-5">

              {/* ── Platform performance ──────────────────────────────── */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Platform Performance</p>
                  <span className="text-[10px] text-slate-300 normal-case tracking-normal">Badges show change vs. last month</span>
                </div>

                {/* Spotify */}
                {(data.sp_streams != null || data.sp_popularity != null) && (
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                    <div className="flex items-center gap-1.5 mb-3">
                      <span className="w-2 h-2 rounded-full bg-[#1DB954]" />
                      <p className="text-xs font-bold text-slate-700">Spotify</p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <CmStatCard label="Total Streams" value={data.sp_streams} diff={md.sp_streams} diffPct={mdp.sp_streams} color="text-[#1DB954]" />
                      <div className="rounded-xl border border-slate-100 bg-white px-3 py-3">
                        <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">Popularity Score</p>
                        <p className="mt-1.5 text-xl font-bold text-[#1DB954]">{data.sp_popularity ?? '—'}<span className="text-xs text-slate-400 font-normal ml-1">/ 100</span></p>
                        <p className="mt-1 text-[10px] text-slate-400">Measures recent stream velocity, not total plays. 40+ is solid for an indie artist.</p>
                      </div>
                      <CmStatCard label="Playlist Count" value={data.num_sp_playlists} diff={md.num_sp_playlists} color="text-[#1DB954]" />
                      <CmStatCard label="Playlist Reach" value={data.sp_playlist_total_reach} diff={md.sp_playlist_total_reach} color="text-[#1DB954]" />
                      <div className="rounded-xl border border-slate-100 bg-white px-3 py-3">
                        <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">Editorial Playlists</p>
                        <p className="mt-1.5 text-xl font-bold text-slate-900">{data.num_sp_editorial_playlists ?? 0}</p>
                        <p className="mt-1 text-[10px] text-slate-400">{(data.num_sp_editorial_playlists ?? 0) > 0 ? 'Spotify editorial pick — significant.' : 'Not yet editorially placed.'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* YouTube */}
                {(data.youtube_views != null || data.num_yt_playlists != null) && (
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                    <div className="flex items-center gap-1.5 mb-3">
                      <span className="w-2 h-2 rounded-full bg-[#FF0000]" />
                      <p className="text-xs font-bold text-slate-700">YouTube</p>
                      <span className="text-[10px] text-slate-400">via Chartmetric — total views on associated YouTube content</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <CmStatCard label="Total Views" value={data.youtube_views} diff={md.youtube_views} color="text-[#FF0000]" />
                      <CmStatCard label="Likes" value={data.youtube_likes} diff={md.youtube_likes} color="text-[#FF0000]" />
                      {data.num_yt_playlists != null && <CmStatCard label="YT Playlists" value={data.num_yt_playlists} color="text-[#FF0000]" />}
                    </div>
                  </div>
                )}

                {/* SoundCloud */}
                {data.soundcloud_plays != null && (
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                    <div className="flex items-center gap-1.5 mb-3">
                      <span className="w-2 h-2 rounded-full bg-[#ff5500]" />
                      <p className="text-xs font-bold text-slate-700">SoundCloud</p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <CmStatCard label="Total Plays" value={data.soundcloud_plays} diff={md.soundcloud_playback_count} color="text-[#ff5500]" />
                    </div>
                  </div>
                )}

                {/* Discovery signals */}
                {(data.shazam_counts != null || data.tiktok_counts != null || data.tiktok_top_videos_views != null) && (
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <p className="text-xs font-bold text-slate-700">Discovery Signals</p>
                      <span className="text-[10px] text-slate-400">These indicate organic reach and viral potential</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {data.shazam_counts != null && (
                        <div className="rounded-xl border border-slate-100 bg-white px-3 py-3">
                          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#1ba8e0]">Shazam Hits</p>
                          <p className="mt-1.5 text-xl font-bold text-slate-900">{(data.shazam_counts ?? 0).toLocaleString()}</p>
                          <p className="mt-1 text-[10px] text-slate-400">People actively searched for this track. High Shazam = strong passive discovery.</p>
                        </div>
                      )}
                      {data.tiktok_counts != null && <CmStatCard label="TikTok Posts" value={data.tiktok_counts} diff={md.tiktok_counts} color="text-slate-800" />}
                      {data.tiktok_top_videos_views != null && <CmStatCard label="TikTok Views" value={data.tiktok_top_videos_views} diff={md.tiktok_top_videos_views} color="text-slate-800" />}
                      {data.genius_page_views != null && <CmStatCard label="Genius Views" value={data.genius_page_views} diff={md.genius_page_views} color="text-slate-800" />}
                      {data.airplay_streams != null && <CmStatCard label="Airplay" value={data.airplay_streams} diff={md.airplay_streams} color="text-slate-800" />}
                    </div>
                  </div>
                )}

                {/* Other platforms */}
                {(data.num_am_playlists != null || data.num_de_playlists != null || data.num_az_playlists != null || data.pandora_lifetime_streams != null) && (
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                    <p className="text-xs font-bold text-slate-700 mb-3">Other Platforms</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {data.num_am_playlists != null && <CmStatCard label="Apple Music Playlists" value={data.num_am_playlists} color="text-[#FA243C]" />}
                      {data.num_de_playlists != null && <CmStatCard label="Deezer Playlists" value={data.num_de_playlists} color="text-[#a238ff]" />}
                      {data.num_az_playlists != null && <CmStatCard label="Amazon Playlists" value={data.num_az_playlists} color="text-[#FF9900]" />}
                      {data.pandora_lifetime_streams != null && <CmStatCard label="Pandora Streams" value={data.pandora_lifetime_streams} color="text-[#224099]" />}
                      {data.tidal_popularity != null && <CmStatCard label="Tidal Popularity" value={data.tidal_popularity} color="text-slate-700" />}
                    </div>
                  </div>
                )}
              </div>

              {/* ── Release identifiers (collapsed by default) ───────── */}
              <details className="group rounded-2xl border border-slate-100 bg-white">
                <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-widest list-none">
                  <span>Release identifiers & metadata</span>
                  <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
                </summary>
                <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 pt-0">
                  {data.upc && (
                    <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
                      <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">UPC</p>
                      <p className="mt-1 font-mono text-sm font-semibold text-slate-900">{data.upc}</p>
                    </div>
                  )}
                  {data.label_name && (
                    <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
                      <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">Label</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{data.label_name}</p>
                    </div>
                  )}
                  {data.cm_track_id && (
                    <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
                      <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">Chartmetric ID</p>
                      <p className="mt-1 font-mono text-sm font-semibold text-slate-900">{data.cm_track_id}</p>
                    </div>
                  )}
                  {data.score != null && (
                    <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
                      <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">CM Score</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{data.score.toFixed(2)}</p>
                      <p className="mt-0.5 text-[10px] text-slate-400">Composite momentum score across all platforms.</p>
                    </div>
                  )}
                  {data.songwriters?.length ? (
                    <div className="col-span-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
                      <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">Songwriters</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{data.songwriters.join(', ')}</p>
                    </div>
                  ) : null}
                </div>
              </details>
            </div>
          )}

          {/* Trend charts tab */}
          {activeTab === 'charts' && data.cm_track_id && (
            <div className="space-y-6">
              <ChartmetricStatsSeries cmId={data.cm_track_id} platform="spotify" type="popularity" label="Spotify Popularity" color="#1DB954" />
              <ChartmetricStatsSeries cmId={data.cm_track_id} platform="spotify" type="streams" label="Spotify Streams" color="#158a3e" />
              <ChartmetricStatsSeries cmId={data.cm_track_id} platform="shazam" label="Shazam Count" color="#1ba8e0" />
              <ChartmetricStatsSeries cmId={data.cm_track_id} platform="chartmetric" type="score" label="Chartmetric Score" color="#7c3aed" />
            </div>
          )}

          {/* Playlists tab */}
          {activeTab === 'playlists' && data.cm_track_id && (
            <ChartmetricPlaylists cmId={data.cm_track_id} />
          )}

          {/* Platform IDs tab */}
          {activeTab === 'ids' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {ids?.spotify_ids?.length ? (
                <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3.5 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#1DB954]">Spotify ID</p>
                  <a
                    href={`https://open.spotify.com/track/${ids.spotify_ids[0]}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1.5 flex items-center gap-1.5 font-mono text-sm font-semibold text-slate-900 hover:text-[#1DB954]"
                  >
                    {ids.spotify_ids[0]}
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                </div>
              ) : null}
              {ids?.itunes_ids?.length ? (
                <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3.5 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#FA243C]">iTunes ID</p>
                  <a
                    href={`https://music.apple.com/us/album/-/${ids.itunes_ids[0]}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1.5 flex items-center gap-1.5 font-mono text-sm font-semibold text-slate-900 hover:text-[#FA243C]"
                  >
                    {ids.itunes_ids[0]}
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                </div>
              ) : null}
              {ids?.shazam_ids?.length ? (
                <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3.5 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#1ba8e0]">Shazam ID</p>
                  <p className="mt-1.5 font-mono text-sm font-semibold text-slate-900">{ids.shazam_ids[0]}</p>
                </div>
              ) : null}
              {data.isrc && (
                <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3.5 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">ISRC</p>
                  <p className="mt-1.5 font-mono text-sm font-semibold text-slate-900">{data.isrc}</p>
                </div>
              )}
              {data.upc && (
                <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3.5 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">UPC</p>
                  <p className="mt-1.5 font-mono text-sm font-semibold text-slate-900">{data.upc}</p>
                </div>
              )}
              {ids?.deezer_ids?.length ? (
                <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3.5 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#a238ff]">Deezer ID</p>
                  <p className="mt-1.5 font-mono text-sm font-semibold text-slate-900">{ids.deezer_ids[0]}</p>
                </div>
              ) : null}
              {ids?.tiktok_ids?.length ? (
                <div className="col-span-2 rounded-2xl border border-slate-100 bg-white px-4 py-3.5 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#010101]">TikTok Sound IDs</p>
                  <div className="mt-1.5 flex flex-col gap-1">
                    {ids.tiktok_ids.map((id) => (
                      <p key={id} className="font-mono text-xs text-slate-700">{id}</p>
                    ))}
                  </div>
                </div>
              ) : null}
              {!ids && <p className="text-xs text-slate-400">Loading platform IDs…</p>}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// ── Unified Performance Panel ────────────────────────────────────────────────

function UnifiedPerformancePanel({ release }: { release: ReleaseRecord }) {
  const stored = (release as any).chartmetric_data as CmData | null | undefined;
  const [cm, setCm] = useState<CmData | null>(stored ?? null);
  const [cmIds, setCmIds] = useState<CmIds | null>(null);
  const [cmLoading, setCmLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'playlisting' | 'trends' | 'metadata'>('overview');

  const hasJointDist = Boolean(release.distribution?.spotify_url || release.spotify_track_id);
  const { stats, loading: ssLoading } = useSongstatsTrackStats(
    release.title, release.isrc, release.songstats_track_id, hasJointDist,
  );
  const bySource: Record<string, Record<string, number>> = {};
  for (const entry of stats?.stats ?? []) bySource[entry.source.toLowerCase()] = entry.data;

  useEffect(() => {
    if (stored?.cm_track_id) {
      const age = (stored as any).synced_at ? Date.now() - new Date((stored as any).synced_at).getTime() : Infinity;
      if (age < 24 * 60 * 60 * 1000) { setCm(stored as CmData); return; }
    }
    if (!release.isrc) return;
    setCmLoading(true);
    fetch(`/api/chartmetric/track?isrc=${encodeURIComponent(release.isrc)}`)
      .then(r => r.json())
      .then(d => setCm(d.track ?? stored ?? null))
      .catch(() => setCm(stored ?? null))
      .finally(() => setCmLoading(false));
  }, [release.isrc, stored?.cm_track_id]);

  useEffect(() => {
    if (!cm?.cm_track_id) return;
    fetch(`/api/chartmetric/track/${cm.cm_track_id}/ids`)
      .then(r => r.json())
      .then(d => { if (d.ids) setCmIds(d.ids); })
      .catch(() => {});
  }, [cm?.cm_track_id]);

  const data = cm;
  const md = data?.monthly_diff ?? {};
  const rs = release.performance?.streams ?? {};

  // Merged per-platform metrics
  const spotify = {
    streams: data?.sp_streams ?? bySource.spotify?.streams_total ?? (Number(rs.spotify) || null),
    popularity: data?.sp_popularity ?? null,
    playlists: data?.num_sp_playlists ?? bySource.spotify?.playlist_count_current ?? null,
    playlistReach: data?.sp_playlist_total_reach ?? bySource.spotify?.playlist_reach_current ?? null,
    editorialPlaylists: data?.num_sp_editorial_playlists ?? null,
    saves: bySource.spotify?.saves_total ?? null,
    url: release.distribution?.spotify_url ?? null,
  };
  const apple = {
    streams: bySource.apple_music?.streams_total ?? (Number(rs.apple) || null),
    playlists: data?.num_am_playlists ?? bySource.apple_music?.playlists_current ?? null,
    editorialPlaylists: bySource.apple_music?.playlists_editorial_current ?? null,
    url: release.distribution?.apple_music_url ?? (data as any)?.apple_music_url ?? null,
  };
  const soundcloud = {
    plays: release.soundcloud_stats?.plays ?? data?.soundcloud_plays ?? (Number(rs.soundcloud) || null),
    likes: release.soundcloud_stats?.likes ?? null,
    reposts: release.soundcloud_stats?.reposts ?? null,
    url: release.distribution?.soundcloud_url ?? null,
  };
  const youtube = {
    views: data?.youtube_views ?? release.youtube_stats?.views ?? (Number(rs.youtube) || null),
    likes: data?.youtube_likes ?? release.youtube_stats?.likes ?? null,
    playlists: data?.num_yt_playlists ?? null,
    url: release.distribution?.youtube_url ?? (data as any)?.youtube_url ?? null,
  };
  const tiktok = {
    posts: data?.tiktok_counts ?? null,
    views: data?.tiktok_top_videos_views ?? null,
  };
  const discovery = {
    shazam: data?.shazam_counts ?? null,
    genius: data?.genius_page_views ?? null,
    airplay: data?.airplay_streams ?? null,
  };
  const other = {
    deezer: data?.num_de_playlists ?? null,
    amazon: data?.num_az_playlists ?? null,
    pandora: data?.pandora_lifetime_streams ?? null,
    tidal: data?.tidal_popularity ?? null,
  };

  const isOnSpotify = Boolean(release.distribution?.spotify_url || release.spotify_track_id);
  const hasSpotify = isOnSpotify && Object.values(spotify).some(v => v != null && v !== 0);
  const hasApple = isOnSpotify && Object.values(apple).some(v => v != null && v !== 0);
  const hasSoundCloud = Object.values(soundcloud).some(v => v != null && v !== 0);
  const hasYouTube = Object.values(youtube).some(v => v != null && v !== 0);
  const hasTikTok = tiktok.posts != null || tiktok.views != null;
  const hasDiscovery = discovery.shazam != null || discovery.genius != null || discovery.airplay != null;
  const hasOther = other.deezer != null || other.amazon != null || other.pandora != null || other.tidal != null;
  const hasPlaylistData = (release.playlist_count ?? 0) > 0 || (release.notable_playlists?.length ?? 0) > 0;
  const hasAnyData = hasSpotify || hasApple || hasSoundCloud || hasYouTube || hasTikTok || hasDiscovery;

  const healthColor: Record<string, string> = {
    rising: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    steady: 'text-blue-600 bg-blue-50 border-blue-200',
    declining: 'text-rose-600 bg-rose-50 border-rose-200',
  };

  const StatCell = ({ label, value, color, note, diff }: { label: string; value: number | null | undefined; color?: string; note?: string; diff?: number | null }) => {
    if (value == null || value === 0 && diff == null) return null;
    return (
      <div className="rounded-xl border border-slate-100 bg-white px-3 py-3">
        <p className={cn('text-[9px] font-bold uppercase tracking-[0.18em]', color ?? 'text-slate-400')}>{label}</p>
        <p className={cn('mt-1.5 text-xl font-bold tabular-nums', color ? color.replace('text-', 'text-') : 'text-slate-900')}>{(value ?? 0).toLocaleString()}</p>
        {diff != null && diff !== 0 && (
          <p className={cn('mt-0.5 text-[10px] font-semibold', diff > 0 ? 'text-emerald-500' : 'text-rose-500')}>
            {diff > 0 ? '+' : ''}{diff.toLocaleString()} mo
          </p>
        )}
        {note && <p className="mt-1 text-[10px] text-slate-400 leading-tight">{note}</p>}
      </div>
    );
  };

  const PlatformBlock = ({ dot, name, url, children }: { dot: string; name: string; url?: string | null; children: React.ReactNode }) => (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: dot }} />
        <p className="text-xs font-bold text-slate-700">{name}</p>
        {url && (
          <a href={url} target="_blank" rel="noopener noreferrer" className="ml-auto flex items-center gap-1 text-[10px] font-semibold text-slate-400 hover:text-slate-700 transition-colors">
            Open <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{children}</div>
    </div>
  );

  const TABS = [
    { id: 'overview' as const, label: 'Overview' },
    { id: 'playlisting' as const, label: 'Playlisting' },
    { id: 'trends' as const, label: 'Trend Charts' },
    { id: 'metadata' as const, label: 'Metadata' },
  ];

  return (
    <section className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-start gap-2.5">
        <TrendingUp className="h-4.5 w-4.5 text-slate-400 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold text-slate-900">Performance</h2>
          {(cmLoading || ssLoading) && (
            <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Refreshing data…
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5 justify-end">
          {data?.career_health && (
            <span className={cn('rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest', healthColor[data.career_health.toLowerCase()] ?? 'text-slate-600 bg-slate-50 border-slate-200')}>
              {data.career_health}
            </span>
          )}
          {data?.track_stage && (
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-600">
              {data.track_stage}
            </span>
          )}
        </div>
      </div>

      {/* Genre / mood tags */}
      {((data?.genres?.length ?? 0) > 0 || (data?.moods?.length ?? 0) > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {(data?.genres ?? []).map(g => (
            <span key={g} className="rounded-full border border-purple-100 bg-purple-50 px-2.5 py-0.5 text-[10px] font-semibold text-purple-600">{g}</span>
          ))}
          {(data?.moods ?? []).slice(0, 4).map(m => (
            <span key={m} className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-0.5 text-[10px] font-semibold text-blue-600">{m}</span>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5">
        {TABS.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors',
              activeTab === tab.id ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Overview tab ── */}
      {activeTab === 'overview' && (
        <div className="space-y-3">
          {!hasAnyData && !cmLoading && !ssLoading && (
            <p className="text-sm text-slate-400">No performance data yet. Run a sync to pull metrics.</p>
          )}

          {hasSpotify && (
            <PlatformBlock dot="#1DB954" name="Spotify" url={spotify.url}>
              {(spotify.streams ?? 0) > 0 && (
                <StatCell label="Streams" value={spotify.streams} color="text-[#1DB954]" diff={md.sp_streams} />
              )}
              {spotify.popularity != null && (
                <div className="rounded-xl border border-slate-100 bg-white px-3 py-3">
                  <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#1DB954]">Popularity</p>
                  <p className="mt-1.5 text-xl font-bold text-[#1DB954] tabular-nums">{spotify.popularity}<span className="text-xs text-slate-400 font-normal ml-1">/ 100</span></p>
                  <p className="mt-1 text-[10px] text-slate-400">Recent velocity score, not lifetime plays.</p>
                </div>
              )}
              <StatCell label="Playlists" value={spotify.playlists} color="text-[#1DB954]" diff={md.num_sp_playlists} />
              <StatCell label="Playlist Reach" value={spotify.playlistReach} color="text-[#1DB954]" />
              <StatCell label="Editorial Playlists" value={spotify.editorialPlaylists} color="text-[#1DB954]" />
              <StatCell label="Saves" value={spotify.saves} color="text-[#1DB954]" />
              {(spotify.streams ?? 0) > 0 && (() => {
                const low = Math.round((spotify.streams ?? 0) * 0.003);
                const high = Math.round((spotify.streams ?? 0) * 0.005);
                const fmt2 = (n: number) => n >= 1000 ? `$${(n/1000).toFixed(1)}k` : `$${n}`;
                return (
                  <div className="col-span-full rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-3">
                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-600">Estimated Earnings</p>
                    <p className="mt-1.5 text-xl font-bold text-emerald-700 tabular-nums">{fmt2(low)} – {fmt2(high)}</p>
                    <p className="mt-1 text-[10px] text-slate-400">Based on {(spotify.streams ?? 0).toLocaleString()} streams at $0.003–$0.005/stream (Spotify indie avg).</p>
                  </div>
                );
              })()}
            </PlatformBlock>
          )}

          {hasApple && (
            <PlatformBlock dot="#FA243C" name="Apple Music" url={apple.url}>
              <StatCell label="Streams" value={apple.streams} color="text-[#FA243C]" />
              <StatCell label="Playlists" value={apple.playlists} color="text-[#FA243C]" diff={md.num_am_playlists} />
              <StatCell label="Editorial" value={apple.editorialPlaylists} color="text-[#FA243C]" />
              {apple.streams == null && apple.playlists == null && (
                <p className="col-span-3 text-[10px] text-slate-400">Apple Music streaming counts are not publicly available via any third-party API. Playlist placement data is pulled where available.</p>
              )}
            </PlatformBlock>
          )}

          {hasSoundCloud && (() => {
            const sc = release.soundcloud_stats ?? {};
            const scTags = sc.tags ?? [];
            const scDesc = sc.description ?? null;
            const scDuration = sc.duration_ms ? (() => {
              const s = Math.floor(sc.duration_ms! / 1000);
              const m = Math.floor(s / 60);
              const sec = s % 60;
              return `${m}:${sec.toString().padStart(2, '0')}`;
            })() : null;
            const tracklist = scDesc ? scDesc.split('\n').filter(l => /^\d{1,3}[.:)\s]/.test(l.trim())).map(l => l.trim()) : [];
            return (
              <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full flex-shrink-0 bg-[#ff5500]" />
                  <p className="text-xs font-bold text-slate-700">SoundCloud</p>
                  {soundcloud.url && (
                    <a href={soundcloud.url} target="_blank" rel="noopener noreferrer" className="ml-auto flex items-center gap-1 text-[10px] font-semibold text-slate-400 hover:text-slate-700 transition-colors">
                      Open <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <StatCell label="Plays" value={soundcloud.plays} color="text-[#ff5500]" diff={md.soundcloud_playback_count} />
                  <StatCell label="Likes" value={soundcloud.likes} color="text-[#ff5500]" />
                  <StatCell label="Reposts" value={soundcloud.reposts} color="text-[#ff5500]" />
                  <StatCell label="Comments" value={sc.comments ?? null} color="text-[#ff5500]" />
                  <StatCell label="Downloads" value={sc.downloads ?? null} color="text-[#ff5500]" />
                  {scDuration && (
                    <div className="rounded-xl border border-slate-100 bg-white px-3 py-3">
                      <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">Duration</p>
                      <p className="mt-1.5 text-lg font-bold text-slate-900 tabular-nums">{scDuration}</p>
                    </div>
                  )}
                </div>
                {scTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {scTags.slice(0, 8).map(tag => (
                      <span key={tag} className="rounded-full border border-orange-100 bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-600">{tag}</span>
                    ))}
                  </div>
                )}
                {tracklist.length > 0 && (
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-2">Tracklist</p>
                    <ol className="space-y-1">
                      {tracklist.map((line, i) => (
                        <li key={i} className="text-xs text-slate-600 leading-relaxed">{line}</li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            );
          })()}

          {hasYouTube && (
            <PlatformBlock dot="#FF0000" name="YouTube" url={youtube.url}>
              <StatCell label="Views" value={youtube.views} color="text-[#FF0000]" diff={md.youtube_views} />
              <StatCell label="Likes" value={youtube.likes} color="text-[#FF0000]" />
              <StatCell label="Playlists" value={youtube.playlists} color="text-[#FF0000]" />
            </PlatformBlock>
          )}

          {hasTikTok && (
            <PlatformBlock dot="#010101" name="TikTok">
              <StatCell label="Posts Using Track" value={tiktok.posts} color="text-slate-800" diff={md.tiktok_counts} />
              <StatCell label="Top Video Views" value={tiktok.views} color="text-slate-800" />
            </PlatformBlock>
          )}

          {hasDiscovery && (
            <PlatformBlock dot="#1ba8e0" name="Discovery Signals">
              {discovery.shazam != null && (
                <div className="rounded-xl border border-slate-100 bg-white px-3 py-3">
                  <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#1ba8e0]">Shazam Hits</p>
                  <p className="mt-1.5 text-xl font-bold text-slate-900 tabular-nums">{(discovery.shazam).toLocaleString()}</p>
                  <p className="mt-1 text-[10px] text-slate-400">People actively ID'd this track — strong passive discovery signal.</p>
                </div>
              )}
              <StatCell label="Genius Views" value={discovery.genius} color="text-slate-600" />
              <StatCell label="Airplay" value={discovery.airplay} color="text-slate-600" />
            </PlatformBlock>
          )}

          {hasOther && (
            <PlatformBlock dot="#94a3b8" name="Other Platforms">
              <StatCell label="Deezer Playlists" value={other.deezer} color="text-[#a238ff]" />
              <StatCell label="Amazon Playlists" value={other.amazon} color="text-[#FF9900]" />
              <StatCell label="Pandora Streams" value={other.pandora} color="text-[#224099]" />
              <StatCell label="Tidal Popularity" value={other.tidal} color="text-slate-700" />
            </PlatformBlock>
          )}
        </div>
      )}

      {/* ── Playlisting tab ── */}
      {activeTab === 'playlisting' && (
        <div className="space-y-4">
          {hasPlaylistData && (
            <div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="rounded-2xl bg-slate-50 p-4 text-center">
                  <p className="text-2xl font-bold text-slate-900">{release.playlist_count ?? 0}</p>
                  <p className="mt-0.5 text-[11px] font-medium text-slate-400">Total playlists</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4 text-center">
                  <p className="text-2xl font-bold text-slate-900">{release.recent_playlist_adds ?? 0}</p>
                  <p className="mt-0.5 text-[11px] font-medium text-slate-400">Recent adds</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4 text-center">
                  <p className="text-2xl font-bold text-slate-900">{release.notable_playlists?.length ?? 0}</p>
                  <p className="mt-0.5 text-[11px] font-medium text-slate-400">Notable</p>
                </div>
              </div>
              {(release.notable_playlists?.length ?? 0) > 0 && (
                <ul className="space-y-2">
                  {release.notable_playlists!.map(pl => (
                    <li key={pl} className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-700">
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      {pl}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {data?.cm_track_id ? (
            <ChartmetricPlaylists cmId={data.cm_track_id} />
          ) : (
            !hasPlaylistData && <p className="text-sm text-slate-400">No playlist data available yet.</p>
          )}
        </div>
      )}

      {/* ── Trends tab ── */}
      {activeTab === 'trends' && (
        <div className="space-y-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Platform breakdown over time</p>
            <SnapshotsChart releaseId={release.id} />
          </div>
          {data?.cm_track_id && (
            <div className="space-y-4 border-t border-slate-100 pt-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Historical trends (Chartmetric)</p>
              <ChartmetricStatsSeries cmId={data.cm_track_id} platform="spotify" type="popularity" label="Spotify Popularity" color="#1DB954" />
              <ChartmetricStatsSeries cmId={data.cm_track_id} platform="spotify" type="streams" label="Spotify Streams" color="#158a3e" />
              <ChartmetricStatsSeries cmId={data.cm_track_id} platform="shazam" label="Shazam Count" color="#1ba8e0" />
              <ChartmetricStatsSeries cmId={data.cm_track_id} platform="chartmetric" type="score" label="Chartmetric Score" color="#7c3aed" />
            </div>
          )}
        </div>
      )}

      {/* ── Metadata tab ── */}
      {activeTab === 'metadata' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {data?.upc && (
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">UPC</p>
                <p className="mt-1 font-mono text-sm font-semibold text-slate-900">{data.upc}</p>
              </div>
            )}
            {release.isrc && (
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">ISRC</p>
                <p className="mt-1 font-mono text-sm font-semibold text-slate-900">{release.isrc}</p>
              </div>
            )}
            {data?.label_name && (
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">Label</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{data.label_name}</p>
              </div>
            )}
            {data?.cm_track_id && (
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">Chartmetric ID</p>
                <p className="mt-1 font-mono text-sm font-semibold text-slate-900">{data.cm_track_id}</p>
              </div>
            )}
            {data?.score != null && (
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">CM Score</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{data.score.toFixed(2)}</p>
                <p className="mt-0.5 text-[10px] text-slate-400">Composite momentum across all platforms.</p>
              </div>
            )}
            {data?.songwriters?.length ? (
              <div className="col-span-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">Songwriters</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{data.songwriters.join(', ')}</p>
              </div>
            ) : null}
          </div>

          {/* Platform IDs */}
          {cmIds && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Platform IDs</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {cmIds.spotify_ids?.length ? (
                  <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#1DB954]">Spotify</p>
                    <a href={`https://open.spotify.com/track/${cmIds.spotify_ids[0]}`} target="_blank" rel="noopener noreferrer" className="mt-1 flex items-center gap-1 font-mono text-xs font-semibold text-slate-700 hover:text-[#1DB954]">
                      {cmIds.spotify_ids[0].slice(0, 14)}… <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  </div>
                ) : null}
                {cmIds.itunes_ids?.length ? (
                  <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#FA243C]">iTunes</p>
                    <p className="mt-1 font-mono text-xs font-semibold text-slate-700">{cmIds.itunes_ids[0]}</p>
                  </div>
                ) : null}
                {cmIds.shazam_ids?.length ? (
                  <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#1ba8e0]">Shazam</p>
                    <p className="mt-1 font-mono text-xs font-semibold text-slate-700">{cmIds.shazam_ids[0]}</p>
                  </div>
                ) : null}
                {cmIds.deezer_ids?.length ? (
                  <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#a238ff]">Deezer</p>
                    <p className="mt-1 font-mono text-xs font-semibold text-slate-700">{cmIds.deezer_ids[0]}</p>
                  </div>
                ) : null}
                {cmIds.tiktok_ids?.length ? (
                  <div className="col-span-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-800">TikTok Sound IDs</p>
                    <div className="mt-1 flex flex-col gap-0.5">
                      {cmIds.tiktok_ids.map(id => <p key={id} className="font-mono text-xs text-slate-700">{id}</p>)}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// ── Streams over time chart ───────────────────────────────────────────────────

type SnapshotSeries = {
  key: string;
  label: string;
  color: string;
  description: string;
};

const SNAPSHOT_SERIES: SnapshotSeries[] = [
  { key: 'sp_streams',    label: 'Spotify Streams',     color: '#1DB954', description: 'Total lifetime streams on Spotify (from Chartmetric)' },
  { key: 'sc_plays',      label: 'SoundCloud Plays',    color: '#ff5500', description: 'Total plays on SoundCloud' },
  { key: 'youtube_views', label: 'YouTube Views',       color: '#FF0000', description: 'Total YouTube views (from Chartmetric)' },
  { key: 'sp_popularity', label: 'Spotify Popularity',  color: '#1ed760', description: 'Spotify popularity score 0–100. Reflects recent stream velocity, not lifetime totals.' },
];

function MiniAreaChart({ data, series }: { data: any[]; series: SnapshotSeries }) {
  const gradId = `grad-${series.key}`;
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span className="inline-block w-2 h-2 rounded-full" style={{ background: series.color }} />
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: series.color }}>{series.label}</p>
        <span className="text-[10px] text-slate-400 normal-case font-normal tracking-normal">— {series.description}</span>
      </div>
      <ResponsiveContainer width="100%" height={120}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={series.color} stopOpacity={0.18} />
              <stop offset="95%" stopColor={series.color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} />
          <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} {...(series.key === 'sp_popularity' ? { domain: [0, 100] } : {})} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #e2e8f0' }}
            formatter={(v: number) => [v.toLocaleString(), series.label]}
          />
          <Area type="monotone" dataKey={series.key} stroke={series.color} fill={`url(#${gradId})`} strokeWidth={2} dot={false} connectNulls />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function SnapshotsChart({ releaseId }: { releaseId: string }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReleaseSnapshots(releaseId)
      .then((rows) => {
        setData(rows.map((r: any) => ({
          date:          format(new Date(r.snapped_at), 'MMM d HH:mm'),
          sp_streams:    r.sp_streams    ?? null,
          sc_plays:      r.sc_plays      ?? null,
          youtube_views: r.youtube_views ?? null,
          sp_popularity: r.sp_popularity ?? null,
        })));
      })
      .finally(() => setLoading(false));
  }, [releaseId]);

  if (loading) return <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-slate-300" /></div>;

  if (data.length < 2) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center">
        <p className="text-sm font-medium text-slate-500">Not enough data yet</p>
        <p className="mt-1 text-xs text-slate-400">Snapshots log automatically on every sync. Run Chartmetric + SoundCloud syncs over a few days to see growth trends here.</p>
      </div>
    );
  }

  // Only render series that have at least one real data point
  const activeSeries = SNAPSHOT_SERIES.filter(s =>
    data.some(d => d[s.key] != null && d[s.key] > 0)
  );

  if (activeSeries.length === 0) {
    return <p className="py-6 text-center text-xs text-slate-400">All snapshot values are zero — sync data will populate charts over time.</p>;
  }

  return (
    <div className="space-y-8">
      {activeSeries.map(s => (
        <MiniAreaChart key={s.key} data={data} series={s} />
      ))}
    </div>
  );
}

// ── Editable field ────────────────────────────────────────────────────────────

function EditableField({
  label,
  value,
  placeholder,
  onChange,
  multiline = false,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 placeholder-slate-300 focus:border-slate-400 focus:bg-white focus:outline-none"
        />
      ) : (
        <input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? 'https://...'}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 placeholder-slate-300 focus:border-slate-400 focus:bg-white focus:outline-none"
        />
      )}
    </div>
  );
}

// ── Assets section ────────────────────────────────────────────────────────────

function AssetsSection({ release, onSaved }: { release: ReleaseRecord; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...release.assets });

  const save = async () => {
    setSaving(true);
    try {
      await saveReleaseMetadata(release.id, { assets: form });
      onSaved();
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const set = (key: string, val: string) => setForm((prev: any) => ({ ...prev, [key]: val || null }));
  const a = release.assets ?? {};

  const ASSET_FIELDS = [
    { key: 'master_url',        label: 'Master WAV/AIFF',     desc: 'Final master file' },
    { key: 'stems_url',         label: 'Stems',                desc: 'Stem bundle (ZIP)' },
    { key: 'artwork_source_url',label: 'Artwork source',       desc: 'Hi-res PSD/PNG' },
    { key: 'radio_edit_url',    label: 'Radio edit',           desc: 'Shorter version' },
    { key: 'instrumental_url',  label: 'Instrumental',         desc: 'No vocals version' },
    { key: 'session_url',       label: 'Session file',         desc: 'DAW project file' },
    { key: 'short_form_url',    label: 'Short-form clip',      desc: '15s / 30s export' },
    { key: 'hypeddit_url',      label: 'Hypeddit / free DL',   desc: 'Free download gate' },
    { key: 'free_download_url', label: 'Direct free download', desc: 'Direct file link' },
  ] as const;

  return (
    <section className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2.5">
        <FileAudio className="h-4.5 w-4.5 text-slate-400" />
        <h2 className="text-base font-bold text-slate-900">Assets & files</h2>
        <button
          onClick={() => editing ? save() : setEditing(true)}
          disabled={saving}
          className="ml-auto flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:border-slate-300 hover:text-slate-800 transition-colors"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : editing ? <Save className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
          {editing ? 'Save' : 'Edit'}
        </button>
        {editing && (
          <button onClick={() => setEditing(false)} className="text-xs text-slate-400 hover:text-slate-600">Cancel</button>
        )}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ASSET_FIELDS.map(({ key, label, desc }) => {
          const url = (a as any)[key] ?? null;
          if (editing) {
            return (
              <EditableField
                key={key}
                label={label}
                value={(form as any)[key] ?? ''}
                placeholder="https://drive.google.com/..."
                onChange={(v) => set(key, v)}
              />
            );
          }
          return url ? (
            <a
              key={key}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition-all hover:border-blue-200 hover:bg-blue-50 hover:shadow-sm"
            >
              <Layers className="h-4 w-4 shrink-0 text-slate-400" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-700">{label}</p>
                <p className="truncate text-[11px] text-slate-400">{desc}</p>
              </div>
              <ExternalLink className="ml-auto h-3.5 w-3.5 shrink-0 text-slate-300" />
            </a>
          ) : (
            <div
              key={key}
              className="flex items-center gap-3 rounded-2xl border border-dashed border-slate-100 bg-slate-50 px-4 py-3"
            >
              <Layers className="h-4 w-4 shrink-0 text-slate-200" />
              <div>
                <p className="text-xs font-semibold text-slate-400">{label}</p>
                <p className="text-[11px] text-slate-300">{desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ── Credits section ───────────────────────────────────────────────────────────

function CreditsSection({ release, onSaved }: { release: ReleaseRecord; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...release.credits });

  const save = async () => {
    setSaving(true);
    try {
      await saveReleaseMetadata(release.id, { credits: form });
      onSaved();
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const set = (key: string, val: string) => setForm((prev: any) => ({ ...prev, [key]: val || null }));
  const c = release.credits ?? {};

  const CREDIT_FIELDS = [
    { key: 'vocalist',    label: 'Vocalist' },
    { key: 'co_producer', label: 'Co-producer' },
    { key: 'co_writer',   label: 'Co-writer' },
    { key: 'mixing',      label: 'Mixing engineer' },
    { key: 'mastering',   label: 'Mastering engineer' },
    { key: 'featured',    label: 'Featured artist' },
    { key: 'publisher',   label: 'Publisher' },
    { key: 'pro',         label: 'PRO (ASCAP / BMI)' },
    { key: 'label',       label: 'Label / released through' },
    { key: 'splits',      label: 'Royalty splits %' },
  ] as const;

  const hasAny = CREDIT_FIELDS.some(({ key }) => !!(c as any)[key]);

  return (
    <section className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2.5">
        <Users className="h-4.5 w-4.5 text-slate-400" />
        <h2 className="text-base font-bold text-slate-900">Credits</h2>
        <button
          onClick={() => editing ? save() : setEditing(true)}
          disabled={saving}
          className="ml-auto flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:border-slate-300 hover:text-slate-800 transition-colors"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : editing ? <Save className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
          {editing ? 'Save' : 'Edit'}
        </button>
        {editing && <button onClick={() => setEditing(false)} className="text-xs text-slate-400 hover:text-slate-600">Cancel</button>}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CREDIT_FIELDS.map(({ key, label }) => {
          const val = (c as any)[key] ?? '';
          if (editing) {
            return (
              <div key={key} className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</label>
                <input
                  type="text"
                  value={(form as any)[key] ?? ''}
                  onChange={(e) => set(key, e.target.value)}
                  placeholder="—"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 placeholder-slate-300 focus:border-slate-400 focus:bg-white focus:outline-none"
                />
              </div>
            );
          }
          if (!val) return null;
          return (
            <div key={key} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">{val}</p>
            </div>
          );
        })}
        {!hasAny && !editing && (
          <p className="col-span-full text-xs text-slate-400">No credits added yet. Click Edit to add them.</p>
        )}
      </div>
    </section>
  );
}

// ── Promotion section ─────────────────────────────────────────────────────────

function PromotionSection({ release, onSaved }: { release: ReleaseRecord; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...release.promotion });

  const save = async () => {
    setSaving(true);
    try {
      await saveReleaseMetadata(release.id, { promotion: form });
      onSaved();
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const set = (key: string, val: string) => setForm((prev: any) => ({ ...prev, [key]: val || null }));
  const p = release.promotion ?? {};

  return (
    <section className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2.5">
        <Megaphone className="h-4.5 w-4.5 text-slate-400" />
        <h2 className="text-base font-bold text-slate-900">Promotion</h2>
        <button
          onClick={() => editing ? save() : setEditing(true)}
          disabled={saving}
          className="ml-auto flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:border-slate-300 hover:text-slate-800 transition-colors"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : editing ? <Save className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
          {editing ? 'Save' : 'Edit'}
        </button>
        {editing && <button onClick={() => setEditing(false)} className="text-xs text-slate-400 hover:text-slate-600">Cancel</button>}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {editing ? (
          <>
            <EditableField label="SubmitHub campaign" value={(form as any).submitHub_url ?? ''} onChange={(v) => set('submitHub_url', v)} />
            <EditableField label="Hypeddit link" value={(form as any).hypeddit_url ?? ''} onChange={(v) => set('hypeddit_url', v)} />
            <EditableField label="PR / press links" value={(form as any).pr_links ?? ''} onChange={(v) => set('pr_links', v)} />
            <EditableField label="Radio / DJ support" value={(form as any).radio_support ?? ''} onChange={(v) => set('radio_support', v)} />
            <div className="sm:col-span-2">
              <EditableField label="Campaign notes" value={(form as any).campaign_notes ?? ''} onChange={(v) => set('campaign_notes', v)} multiline />
            </div>
          </>
        ) : (
          <>
            {[
              { key: 'submitHub_url', label: 'SubmitHub' },
              { key: 'hypeddit_url',  label: 'Hypeddit' },
              { key: 'pr_links',      label: 'PR / press' },
              { key: 'radio_support', label: 'Radio / DJ support' },
            ].map(({ key, label }) => {
              const val = (p as any)[key];
              if (!val) return null;
              return (
                <a key={key} href={val} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:border-blue-200 hover:bg-blue-50 transition-colors">
                  {label}
                  <ExternalLink className="ml-auto h-3.5 w-3.5 text-slate-300" />
                </a>
              );
            })}
            {(p as any).campaign_notes && (
              <div className="sm:col-span-2 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Campaign notes</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{(p as any).campaign_notes}</p>
              </div>
            )}
            {!Object.values(p ?? {}).some(Boolean) && (
              <p className="col-span-full text-xs text-slate-400">No promotion data yet. Click Edit to add links and notes.</p>
            )}
          </>
        )}
      </div>
    </section>
  );
}

// ═══ Main page ════════════════════════════════════════════════════════════════

interface ReleaseDetailProps {
  /** When true, renders as a public microsite without auth controls */
  publicMode?: boolean;
}

export function ReleaseDetail({ publicMode = false }: ReleaseDetailProps) {
  const params = useParams<{ releaseId?: string; id?: string }>();
  const releaseId = params.releaseId ?? params.id;
  const navigate = useNavigate();
  const { canCreateTrack } = useCurrentUserRole();

  const [release,      setRelease]      = useState<ReleaseRecord | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [formOpen,     setFormOpen]     = useState(false);
  const [linkCopied,   setLinkCopied]   = useState(false);
  const [audioFeatures, setAudioFeatures] = useState<{ bpm: number | null; key_display: string | null; energy: number | null; danceability: number | null } | null>(null);

  const load = useCallback(async () => {
    if (!releaseId) return;
    setLoading(true);
    try {
      setRelease(await fetchReleaseById(releaseId));
    } finally {
      setLoading(false);
    }
  }, [releaseId]);

  useEffect(() => { load(); }, [load]);

  // Fetch Spotify audio features (BPM, key) when we have a spotify_track_id
  useEffect(() => {
    const tid = release?.spotify_track_id;
    if (!tid) return;
    // Always fetch — stored values may be stale or missing
    fetch(`/api/spotify/audio-features/${tid}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => { if (d?.bpm != null || d?.key_display) setAudioFeatures(d); })
      .catch(() => {});
  }, [release?.spotify_track_id]);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  };

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // ── Not found ──────────────────────────────────────────────────────────────

  if (!release) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[2rem] border border-slate-100 bg-white p-16 text-center shadow-sm">
        <Music2 className="h-12 w-12 text-slate-200" />
        <h2 className="mt-6 text-2xl font-bold text-slate-900">Release not found</h2>
        <p className="mt-2 text-slate-500">This release link is missing or no longer available.</p>
        {!publicMode && (
          <Link to="/releases" className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-600 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to releases
          </Link>
        )}
      </div>
    );
  }

  // ── Build streaming links ─────────────────────────────────────────────────

  const spotifyLink     = release.distribution?.spotify_url ?? spotifyUrl(release.spotify_track_id);
  const soundcloudLink  = release.distribution?.soundcloud_url ?? soundcloudUrl(release.soundcloud_track_id);
  const appleMusicLink  = release.distribution?.apple_music_url ?? (release as any).chartmetric_data?.apple_music_url ?? null;
  const youtubeLink     = release.distribution?.youtube_url ?? (release as any).chartmetric_data?.youtube_url ?? null;
  const hasStreaming     = !!(spotifyLink || soundcloudLink || appleMusicLink || youtubeLink);

  // Resolved BPM and key — stored → live Spotify → Chartmetric
  const cmData = (release as any).chartmetric_data;
  const displayBpm = release.bpm ?? audioFeatures?.bpm ?? cmData?.bpm ?? null;
  const displayKey = release.musical_key ?? audioFeatures?.key_display ?? cmData?.key ?? null;
  const displayUpc = (release as any).chartmetric_data?.upc ?? null;

  // ── Page content ──────────────────────────────────────────────────────────

  const content = (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-8 pb-20"
    >
      {/* ── Nav bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        {!publicMode ? (
          <button
            onClick={() => navigate('/music/released')}
            className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Released Tracks
          </button>
        ) : (
          <div />
        )}

        <div className="flex gap-2">
          <button
            onClick={copyLink}
            className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
          >
            {linkCopied ? <Check className="h-4 w-4 text-emerald-500" /> : <Share2 className="h-4 w-4" />}
            {linkCopied ? 'Copied' : 'Share'}
          </button>
          {!publicMode && canCreateTrack && (
            <button
              onClick={() => setFormOpen(true)}
              className="flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow transition-colors hover:bg-blue-600"
            >
              <Edit2 className="h-4 w-4" />
              Edit
            </button>
          )}
        </div>
      </div>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <header className="grid gap-8 lg:grid-cols-[360px_minmax(0,1fr)]">

        {/* Cover art */}
        <div className="relative overflow-hidden rounded-[2rem] shadow-2xl shadow-slate-200">
          {release.cover_art_url ? (
            <img
              src={release.cover_art_url}
              alt={release.title}
              className="aspect-square h-full w-full object-cover"
            />
          ) : (
            <div className="flex aspect-square items-center justify-center bg-[radial-gradient(circle_at_top_left,#dbeafe,transparent_60%),linear-gradient(135deg,#0f172a,#1e293b)]">
              <Disc3 className="h-24 w-24 text-white/20" />
            </div>
          )}

          {/* Status overlay */}
          <div className="absolute bottom-4 left-4">
            <span className={cn(
              'rounded-xl border px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest backdrop-blur-md',
              statusBadge(release.status),
            )}>
              {statusLabel(release.status)}
            </span>
          </div>
        </div>

        {/* Meta column */}
        <div className="flex flex-col justify-center gap-6">

          {/* Title + artist */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">
              {publicMode ? 'Release' : 'Release detail'}
            </p>
            <h1 className="mt-2 text-4xl font-bold leading-tight tracking-tight text-slate-900 md:text-5xl">
              {release.title}
            </h1>
            <p className="mt-2 text-lg font-medium text-slate-500">
              {release.artist_name || 'WES'}
            </p>
          </div>

          {/* Meta chips */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-3">
            <MetaChip
              label="Release date"
              value={
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                  {fmtDate(release.release_date)}
                </span>
              }
            />
            <MetaChip
              label="BPM"
              value={displayBpm != null ? `${displayBpm} BPM` : '—'}
            />
            <MetaChip
              label="Key"
              value={displayKey || '—'}
            />
            {release.isrc
              ? <IsrcChip isrc={release.isrc} />
              : <MetaChip label="ISRC" value="Pending" />
            }
            {displayUpc && (
              <MetaChip label="UPC" value={displayUpc} />
            )}
          </div>

          {/* Notes */}
          {release.notes && (
            <div className="rounded-[1.75rem] border border-slate-100 bg-white p-5 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Notes</p>
              <p className="mt-3 text-sm leading-6 text-slate-600">{release.notes}</p>
            </div>
          )}
        </div>
      </header>

      {/* ── Streaming links ───────────────────────────────────────────────── */}
      <section className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2.5">
          <Music2 className="h-4.5 w-4.5 text-slate-400" />
          <h2 className="text-base font-bold text-slate-900">Streaming links</h2>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {spotifyLink ? (
            <StreamingLink href={spotifyLink} label="Spotify" color="border-[#1DB954]/20 bg-[#1DB954]/5 text-[#158a3e] hover:border-[#1DB954]/40" icon="🎵" />
          ) : (
            <div className="flex items-center gap-3 rounded-2xl border border-dashed border-slate-100 bg-slate-50 px-4 py-3.5">
              <span className="text-xl">🎵</span>
              <div className="min-w-0 flex-1">
                <span className="text-sm font-medium text-slate-400">Spotify</span>
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-300 mt-0.5">Not on Spotify</p>
              </div>
            </div>
          )}
          {soundcloudLink ? (
            <StreamingLink href={soundcloudLink} label="SoundCloud" color="border-orange-200 bg-orange-50 text-orange-700 hover:border-orange-300" icon="🔊" />
          ) : (
            <div className="flex items-center gap-3 rounded-2xl border border-dashed border-slate-100 bg-slate-50 px-4 py-3.5">
              <span className="text-xl">🔊</span>
              <div className="min-w-0 flex-1">
                <span className="text-sm font-medium text-slate-400">SoundCloud</span>
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-300 mt-0.5">Not linked</p>
              </div>
            </div>
          )}
          {spotifyLink && (appleMusicLink ? (
            <StreamingLink href={appleMusicLink} label="Apple Music" color="border-[#FA243C]/20 bg-[#FA243C]/5 text-[#c4001a] hover:border-[#FA243C]/40" icon="🎶" />
          ) : (
            <div className="flex items-center gap-3 rounded-2xl border border-dashed border-slate-100 bg-slate-50 px-4 py-3.5">
              <span className="text-xl">🎶</span>
              <div className="min-w-0 flex-1">
                <span className="text-sm font-medium text-slate-400">Apple Music</span>
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-300 mt-0.5">Sync Chartmetric to link</p>
              </div>
            </div>
          ))}
          {spotifyLink && (youtubeLink ? (
            <StreamingLink href={youtubeLink} label="YouTube" color="border-[#FF0000]/20 bg-[#FF0000]/5 text-[#c00] hover:border-[#FF0000]/40" icon="▶️" />
          ) : (
            <div className="flex items-center gap-3 rounded-2xl border border-dashed border-slate-100 bg-slate-50 px-4 py-3.5">
              <span className="text-xl">▶️</span>
              <div className="min-w-0 flex-1">
                <span className="text-sm font-medium text-slate-400">YouTube</span>
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-300 mt-0.5">Sync Chartmetric to link</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Assets ───────────────────────────────────────────────────────── */}
      <AssetsSection release={release} onSaved={load} />

      {/* ── Unified Performance Panel ─────────────────────────────────────── */}
      <UnifiedPerformancePanel release={release} />
    </motion.div>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  if (publicMode) {
    return (
      <div className="min-h-screen bg-[#f5f4f0] px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-6xl">{content}</div>
      </div>
    );
  }

  return (
    <>
      {content}

      {/* Edit modal — internal only */}
      <ReleaseFormModal
        open={formOpen}
        release={release}
        onClose={() => setFormOpen(false)}
        onSaved={load}
      />
    </>
  );
}
