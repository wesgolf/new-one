/**
 * AnalyticsDashboard — provider-agnostic analytics shell.
 *
 * Sections:
 *  1. Hero KPI strip
 *  2. Platform cards grid (branded)
 *  3. Audience distribution donut
 *  4. Playlisting leaderboard
 *  5. Charts presence panel
 *  + Source attribution / sync status
 */
import React, { useState, useMemo } from 'react';
import {
  Activity,
  AlertCircle,
  BarChart2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Globe,
  Headphones,
  ListMusic,
  Loader2,
  RefreshCw,
  Settings,
  TrendingUp,
  Trophy,
  Users,
  XCircle,
  Zap,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { cn } from '../lib/utils';
import { ApiErrorBanner } from './ApiErrorBanner';
import { useAnalytics } from '../hooks/useAnalytics';
import type {
  AnalyticsProviderState,
  PlatformSnapshot,
} from '../types/domain';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatNumber(n: number): string {
  if (n == null || isNaN(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
  if (abs >= 1_000_000)     return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (abs >= 1_000)         return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return Math.round(n).toLocaleString();
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ── Status badges ─────────────────────────────────────────────────────────────

const PROVIDER_STATUS_ICON: Record<string, React.ReactNode> = {
  ready:          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />,
  not_configured: <Settings     className="w-3.5 h-3.5 text-slate-400"   />,
  error:          <XCircle      className="w-3.5 h-3.5 text-rose-500"    />,
};

const PROVIDER_STATUS_LABEL: Record<string, string> = {
  ready:          'Ready',
  not_configured: 'Not configured',
  error:          'Error',
};

// ── 1. Hero KPI strip ─────────────────────────────────────────────────────────

interface HeroKpi {
  id: string;
  label: string;
  value: number;
  icon: React.ReactNode;
  accent: string;
  caption?: string;
}

function HeroStrip({ kpis }: { kpis: HeroKpi[] }) {
  if (kpis.length === 0) return null;
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {kpis.map(kpi => (
        <div
          key={kpi.id}
          className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-5 shadow-sm"
        >
          <div
            className="absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-10 blur-2xl"
            style={{ background: kpi.accent }}
          />
          <div className="relative flex items-start justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {kpi.label}
            </span>
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{ background: hexToRgba(kpi.accent, 0.12), color: kpi.accent }}
            >
              {kpi.icon}
            </div>
          </div>
          <p className="relative mt-4 text-3xl font-black tabular-nums text-slate-900">
            {formatNumber(kpi.value)}
          </p>
          {kpi.caption && (
            <p className="relative mt-1 text-[11px] font-medium text-slate-400">{kpi.caption}</p>
          )}
        </div>
      ))}
    </div>
  );
}

// ── 2. Platform cards ─────────────────────────────────────────────────────────

function PlatformCard({ platform, rank }: { platform: PlatformSnapshot; rank: number }) {
  const { brandColor } = platform;
  return (
    <div
      className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-5 shadow-sm transition hover:shadow-md"
    >
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{ background: brandColor }}
      />
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-black text-white"
            style={{ background: brandColor }}
          >
            {platform.label.charAt(0)}
          </div>
          <div>
            <p className="text-sm font-black text-slate-900">{platform.label}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {platform.category}
            </p>
          </div>
        </div>
        {rank <= 3 && (
          <span
            className="text-[10px] font-black px-2 py-0.5 rounded-full"
            style={{
              background: hexToRgba(brandColor, 0.12),
              color: brandColor,
            }}
          >
            #{rank}
          </span>
        )}
      </div>

      {platform.primary && (
        <div className="mt-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            {platform.primary.label}
          </p>
          <p className="text-3xl font-black tabular-nums text-slate-900 mt-1">
            {formatNumber(platform.primary.value)}
            {platform.primary.unit && (
              <span className="text-base font-bold text-slate-400 ml-1">
                {platform.primary.unit}
              </span>
            )}
          </p>
        </div>
      )}

      {platform.secondary.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4">
          {platform.secondary.slice(0, 3).map((s, i) => (
            <div key={i}>
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 truncate">
                {s.label}
              </p>
              <p className="text-sm font-black tabular-nums text-slate-700 mt-0.5">
                {formatNumber(s.value)}
                {s.unit && <span className="text-[10px] text-slate-400 ml-0.5">{s.unit}</span>}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── 3. Audience distribution donut ───────────────────────────────────────────

function AudienceDistribution({ platforms }: { platforms: PlatformSnapshot[] }) {
  const data = useMemo(
    () =>
      platforms
        .filter(p => p.audienceSize > 0)
        .map(p => ({
          name: p.label,
          value: p.audienceSize,
          color: p.brandColor,
        }))
        .sort((a, b) => b.value - a.value),
    [platforms],
  );

  const total = data.reduce((s, d) => s + d.value, 0);

  if (data.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <p className="text-sm font-black text-slate-900">Audience Distribution</p>
        <p className="mt-2 text-xs text-slate-400">No follower data available.</p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-slate-500" />
        <p className="text-sm font-black text-slate-900">Audience Distribution</p>
      </div>
      <p className="mt-1 text-[11px] text-slate-400">Where your audience lives across platforms</p>

      <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row">
        <div className="relative h-44 w-44 shrink-0">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={55}
                outerRadius={78}
                paddingAngle={2}
                stroke="none"
              >
                {data.map(d => (
                  <Cell key={d.name} fill={d.color} />
                ))}
              </Pie>
              <RechartsTooltip
                formatter={(v: number) => formatNumber(v)}
                contentStyle={{
                  borderRadius: 12,
                  border: '1px solid #e2e8f0',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Total</p>
            <p className="text-xl font-black tabular-nums text-slate-900">{formatNumber(total)}</p>
          </div>
        </div>

        <ul className="flex-1 space-y-2 w-full">
          {data.slice(0, 6).map(d => {
            const pct = total > 0 ? (d.value / total) * 100 : 0;
            return (
              <li key={d.name} className="flex items-center gap-3">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: d.color }}
                />
                <span className="flex-1 text-xs font-bold text-slate-700 truncate">{d.name}</span>
                <span className="text-xs font-black tabular-nums text-slate-900">
                  {formatNumber(d.value)}
                </span>
                <span className="w-10 text-right text-[10px] font-bold text-slate-400 tabular-nums">
                  {pct.toFixed(1)}%
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

// ── 4. Playlisting leaderboard ───────────────────────────────────────────────

function PlaylistLeaderboard({ platforms }: { platforms: PlatformSnapshot[] }) {
  const rows = useMemo(
    () =>
      platforms
        .filter(p => (p.totalPlaylists ?? 0) > 0 || (p.playlistReach ?? 0) > 0)
        .map(p => ({
          id: p.id,
          label: p.label,
          color: p.brandColor,
          playlists: p.totalPlaylists ?? 0,
          reach: p.playlistReach ?? 0,
          editorial: p.editorialCount ?? 0,
        }))
        .sort((a, b) => (b.reach || b.playlists) - (a.reach || a.playlists)),
    [platforms],
  );

  if (rows.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <p className="text-sm font-black text-slate-900">Playlist Leaderboard</p>
        <p className="mt-2 text-xs text-slate-400">No playlist data available.</p>
      </div>
    );
  }

  const maxReach = Math.max(...rows.map(r => r.reach || r.playlists), 1);

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <ListMusic className="h-4 w-4 text-slate-500" />
        <p className="text-sm font-black text-slate-900">Playlist Leaderboard</p>
      </div>
      <p className="mt-1 text-[11px] text-slate-400">Ranked by playlist reach</p>

      <div className="mt-4 space-y-3">
        {rows.map((r, i) => {
          const barValue = r.reach || r.playlists;
          const pct = (barValue / maxReach) * 100;
          return (
            <div key={r.id}>
              <div className="flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[10px] font-black text-slate-400 tabular-nums w-4">
                    {i + 1}
                  </span>
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: r.color }}
                  />
                  <span className="font-bold text-slate-900 truncate">{r.label}</span>
                  {r.editorial > 0 && (
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600">
                      {r.editorial} editorial
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0 tabular-nums">
                  <span className="font-black text-slate-900">{formatNumber(r.playlists)}</span>
                  <span className="text-slate-400 text-[10px]">playlists</span>
                  {r.reach > 0 && (
                    <span className="text-slate-500 text-[11px]">
                      • {formatNumber(r.reach)} reach
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pct}%`, background: r.color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 5. Charts presence ───────────────────────────────────────────────────────

function ChartsPresence({ platforms }: { platforms: PlatformSnapshot[] }) {
  const rows = useMemo(
    () =>
      platforms
        .filter(p => (p.chartsCount ?? 0) > 0 || (p.chartedTracks ?? 0) > 0)
        .map(p => ({
          id: p.id,
          label: p.label,
          color: p.brandColor,
          charts: p.chartsCount ?? 0,
          tracks: p.chartedTracks ?? 0,
        }))
        .sort((a, b) => b.charts - a.charts || b.tracks - a.tracks),
    [platforms],
  );

  if (rows.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <p className="text-sm font-black text-slate-900">Chart Presence</p>
        <p className="mt-2 text-xs text-slate-400">Not currently charting on any tracked platform.</p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <Trophy className="h-4 w-4 text-slate-500" />
        <p className="text-sm font-black text-slate-900">Chart Presence</p>
      </div>
      <p className="mt-1 text-[11px] text-slate-400">Active charts and charted tracks per platform</p>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {rows.map(r => (
          <div
            key={r.id}
            className="rounded-2xl border border-slate-100 p-3"
            style={{ background: hexToRgba(r.color, 0.04) }}
          >
            <div className="flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: r.color }}
              />
              <p className="text-xs font-black text-slate-900">{r.label}</p>
            </div>
            <div className="mt-2 flex items-baseline gap-3">
              <div>
                <p className="text-lg font-black tabular-nums text-slate-900">{r.charts}</p>
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                  Charts
                </p>
              </div>
              {r.tracks > 0 && (
                <div className="border-l border-slate-200 pl-3">
                  <p className="text-lg font-black tabular-nums text-slate-700">{r.tracks}</p>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                    Tracks
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Source attribution ───────────────────────────────────────────────────────

function ProviderStatusRow({ state }: { state: AnalyticsProviderState }) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl border border-slate-100 bg-white">
      <div className="mt-0.5 shrink-0">
        {PROVIDER_STATUS_ICON[state.status] ?? PROVIDER_STATUS_ICON.error}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold text-slate-900">{state.provider}</p>
          <span className={cn(
            'text-[9px] font-bold px-2 py-0.5 rounded-full',
            state.status === 'ready'          && 'bg-emerald-50 text-emerald-600',
            state.status === 'not_configured' && 'bg-slate-100 text-slate-500',
            state.status === 'error'          && 'bg-rose-50 text-rose-600',
          )}>
            {PROVIDER_STATUS_LABEL[state.status] ?? state.status}
          </span>
        </div>
        {state.errorMessage && (
          <p className="text-[10px] text-slate-400 mt-1">{state.errorMessage}</p>
        )}
        {state.lastSyncedAt && (
          <div className="flex items-center gap-1 mt-1">
            <Clock className="w-2.5 h-2.5 text-slate-400" />
            <p className="text-[10px] text-slate-400">
              Last synced: {new Date(state.lastSyncedAt).toLocaleString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export const AnalyticsDashboard: React.FC = () => {
  const { payload, providerStates, loading, error, refresh } = useAnalytics();
  const [statusOpen, setStatusOpen] = useState(true);

  const platforms = (payload.platforms ?? []).slice().sort(
    (a, b) => b.audienceSize - a.audienceSize,
  );

  // Build hero KPIs from platform & metric data
  const heroKpis = useMemo<HeroKpi[]>(() => {
    const totalReach = platforms.reduce((s, p) => s + p.audienceSize, 0);
    const monthlyListeners =
      platforms.find(p => p.id === 'spotify')?.primary?.value ?? 0;
    const totalStreams =
      payload.streaming.find(m => m.id === 'sp_streams')?.value ?? 0;
    const engagementMetrics = payload.social.filter(m => m.unit === '%');
    const avgEngagement =
      engagementMetrics.length > 0
        ? engagementMetrics.reduce((s, m) => s + m.value, 0) /
          engagementMetrics.length
        : 0;

    return [
      {
        id: 'reach',
        label: 'Total Reach',
        value: totalReach,
        icon: <Globe className="h-4 w-4" />,
        accent: '#6366F1',
        caption: `${platforms.length} platforms`,
      },
      {
        id: 'monthly',
        label: 'Monthly Listeners',
        value: monthlyListeners,
        icon: <Headphones className="h-4 w-4" />,
        accent: '#1DB954',
        caption: 'Spotify',
      },
      {
        id: 'streams',
        label: 'Total Streams',
        value: totalStreams,
        icon: <BarChart2 className="h-4 w-4" />,
        accent: '#FA243C',
        caption: 'All-time',
      },
      {
        id: 'engagement',
        label: 'Avg Engagement',
        value: 0,
        icon: <TrendingUp className="h-4 w-4" />,
        accent: '#E1306C',
        caption: avgEngagement > 0
          ? `${avgEngagement.toFixed(2)}% across ${engagementMetrics.length} platforms`
          : 'No engagement data',
      },
    ].map(k =>
      k.id === 'engagement'
        ? { ...k, value: avgEngagement, caption: k.caption }
        : k,
    );
  }, [platforms, payload]);

  const configuredCount = providerStates.filter(s => s.status === 'ready').length;
  const errorCount      = providerStates.filter(s => s.status === 'error').length;
  const anyData         = platforms.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-text-primary md:text-4xl">
            Analytics
          </h2>
          <p className="mt-1 text-text-secondary">
            Cross-platform performance overview.
            {configuredCount > 0
              ? ` ${configuredCount} source${configuredCount > 1 ? 's' : ''} active.`
              : ' No providers configured yet.'}
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </header>

      {/* Error banner */}
      {error && (
        <ApiErrorBanner error={error} onRetry={refresh} onDismiss={() => {}} />
      )}

      {/* Loading */}
      {loading && (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      )}

      {/* Setup nudge */}
      {!loading && !anyData && configuredCount === 0 && (
        <div className="rounded-3xl border border-dashed border-blue-200 bg-blue-50/40 p-8 flex flex-col items-center text-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white border border-blue-100 shadow-sm">
            <Zap className="w-7 h-7 text-blue-500" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Connect your first analytics source</h3>
            <p className="text-sm text-slate-500 max-w-md mt-2">
              Artist OS supports Spotify, Songstats, and Soundcharts. Once connected, streaming,
              playlisting, audience, and social metrics will populate here automatically.
            </p>
          </div>
        </div>
      )}

      {!loading && anyData && (
        <>
          {/* 1. Hero KPI strip */}
          <HeroStrip kpis={heroKpis} />

          {/* 2. Platform cards */}
          <section>
            <div className="mb-3 flex items-center gap-2">
              <Activity className="h-4 w-4 text-slate-500" />
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                Platforms
              </p>
              <span className="text-[10px] font-bold text-slate-400">
                {platforms.length} active
              </span>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {platforms.map((p, i) => (
                <PlatformCard key={p.id} platform={p} rank={i + 1} />
              ))}
            </div>
          </section>

          {/* 3 + 4. Audience distribution + playlist leaderboard */}
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <AudienceDistribution platforms={platforms} />
            <PlaylistLeaderboard platforms={platforms} />
          </section>

          {/* 5. Charts presence */}
          <section>
            <ChartsPresence platforms={platforms} />
          </section>
        </>
      )}

      {/* Source attribution */}
      {!loading && providerStates.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <button
            type="button"
            onClick={() => setStatusOpen(o => !o)}
            className="flex w-full items-center gap-3 p-4 hover:bg-slate-50 transition-colors text-left"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white border border-slate-100 shadow-sm">
              <Globe className="w-4 h-4 text-slate-500" />
            </div>
            <span className="flex-1 text-sm font-bold text-slate-900">Source Attribution</span>
            {errorCount > 0 && (
              <div className="flex items-center gap-1 text-rose-600">
                <AlertCircle className="w-3.5 h-3.5" />
                <span className="text-xs font-bold">{errorCount} error{errorCount > 1 ? 's' : ''}</span>
              </div>
            )}
            {statusOpen
              ? <ChevronUp   className="w-4 h-4 text-slate-400 shrink-0" />
              : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
          </button>
          {statusOpen && (
            <div className="grid gap-2 p-4 pt-0 sm:grid-cols-2 lg:grid-cols-3">
              {providerStates.map(state => (
                <ProviderStatusRow key={state.provider} state={state} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
