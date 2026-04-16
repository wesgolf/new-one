/**
 * AnalyticsDashboard — provider-agnostic analytics shell.
 *
 * Data comes exclusively through the analytics provider abstraction
 * (useAnalytics → ANALYTICS_REGISTRY). No page-level fetch logic.
 * Charts are only rendered when real data is present.
 */
import React, { useState } from 'react';
import {
  Activity,
  BarChart2,
  ChevronDown,
  ChevronUp,
  Globe,
  ListMusic,
  Loader2,
  Music,
  RefreshCw,
  Share2,
  TrendingUp,
  Users,
  Zap,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Settings,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { ApiErrorBanner } from './ApiErrorBanner';
import { useAnalytics } from '../hooks/useAnalytics';
import type { AnalyticsOverviewMetric, AnalyticsProviderState } from '../types/domain';

// ── Small shared UI pieces ────────────────────────────────────────────────────

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

function MetricCard({ metric }: { metric: AnalyticsOverviewMetric }) {
  const trendPositive = (metric.trend ?? 0) > 0;
  const trendStr = metric.trend != null
    ? `${trendPositive ? '+' : ''}${metric.trend.toFixed(1)}%`
    : null;
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
          {metric.label}
        </span>
        {trendStr && (
          <span className={cn(
            'text-[10px] font-bold px-2 py-0.5 rounded-full',
            trendPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600',
          )}>
            {trendStr}
          </span>
        )}
      </div>
      <p className="text-2xl font-black text-slate-900 tabular-nums">
        {typeof metric.value === 'number' ? metric.value.toLocaleString() : metric.value}
        {metric.unit && (
          <span className="text-sm font-bold text-slate-400 ml-1">{metric.unit}</span>
        )}
      </p>
      <p className="text-[10px] text-slate-400">{metric.sourceProvider}</p>
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  count,
  expanded,
  onToggle,
  badge,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  expanded: boolean;
  onToggle: () => void;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center gap-3 rounded-2xl p-4 bg-slate-50/60 hover:bg-slate-50 transition-colors text-left"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white border border-slate-100 shadow-sm">
        {icon}
      </div>
      <span className="flex-1 text-sm font-bold text-slate-900">{title}</span>
      {badge && (
        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">{badge}</span>
      )}
      <span className={cn(
        'text-[10px] font-bold rounded-full px-2 py-0.5',
        count > 0 ? 'bg-slate-200 text-slate-600' : 'bg-slate-100 text-slate-400',
      )}>
        {count > 0 ? count : 'No data'}
      </span>
      {expanded
        ? <ChevronUp   className="w-4 h-4 text-slate-400 shrink-0" />
        : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
    </button>
  );
}

function EmptySectionState({
  description,
  providers,
}: {
  description: string;
  providers: string[];
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/40 p-6 flex flex-col items-center text-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-slate-100 shadow-sm">
        <Activity className="w-5 h-5 text-slate-300" />
      </div>
      <div>
        <p className="text-sm font-bold text-slate-600">No data yet</p>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">{description}</p>
      </div>
      {providers.length > 0 && (
        <div className="flex flex-wrap gap-1 justify-center mt-1">
          {providers.map(p => (
            <span key={p} className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-500 border border-blue-100">
              {p}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

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

// ── Domain section config ─────────────────────────────────────────────────────

const DOMAIN_CONFIG = [
  {
    key:          'streaming' as const,
    title:        'Streaming Performance',
    icon:         <Music   className="w-4 h-4 text-emerald-600" />,
    badge:        'Spotify · Apple Music · Soundcharts',
    description:  'Streams, saves, skip rate, and release-level performance will appear here once a streaming analytics provider is connected.',
    providers:    ['Spotify', 'Songstats', 'Soundcharts'],
  },
  {
    key:          'playlist' as const,
    title:        'Playlisting',
    icon:         <ListMusic className="w-4 h-4 text-purple-600" />,
    badge:        'Songstats · Soundcharts',
    description:  'Active playlists, recent adds, notable editorial placements, and curator breakdown will appear here when Songstats or Soundcharts is configured.',
    providers:    ['Songstats', 'Soundcharts'],
  },
  {
    key:          'audience' as const,
    title:        'Audience Growth',
    icon:         <Users  className="w-4 h-4 text-blue-600" />,
    badge:        'Spotify · SoundCloud',
    description:  'Follower counts, listener-to-follower ratio, demographic breakdowns, and 30-day growth will appear here.',
    providers:    ['Spotify', 'Soundcharts'],
  },
  {
    key:          'social' as const,
    title:        'Social Metrics',
    icon:         <Share2 className="w-4 h-4 text-rose-500" />,
    badge:        'Instagram · TikTok',
    description:  'Engagement rate, reach, profile visits, and cross-platform social performance will appear here.',
    providers:    ['Songstats', 'Soundcharts'],
  },
  {
    key:          'releases' as const,
    title:        'Release Performance',
    icon:         <BarChart2 className="w-4 h-4 text-amber-500" />,
    badge:        'Multi-platform',
    description:  'Per-release stream counts, playlist adds, and trend lines will appear here when streaming providers are connected.',
    providers:    ['Spotify', 'Songstats'],
  },
];

// ── Main component ────────────────────────────────────────────────────────────

export const AnalyticsDashboard: React.FC = () => {
  const { payload, providerStates, loading, error, refresh } = useAnalytics();

  // Track which sections are expanded
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    streaming: true,
    playlist:  true,
    audience:  true,
    social:    false,
    releases:  false,
    status:    true,
  });

  const toggle = (key: string) =>
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  // Flatten all metrics for Overview cards
  const allMetrics = [
    ...payload.audience,
    ...payload.streaming,
    ...payload.playlist,
    ...payload.social,
    ...payload.releases,
  ];

  const configuredCount = providerStates.filter(s => s.status === 'ready').length;
  const errorCount      = providerStates.filter(s => s.status === 'error').length;
  const anyData         = allMetrics.length > 0;

  return (
    <div className="space-y-6">

      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
            Analytics
          </h2>
          <p className="mt-1 text-slate-500">
            Provider-agnostic performance overview.
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

      {/* Loading state */}
      {loading && (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      )}

      {/* Setup nudge when nothing configured */}
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
          <div className="flex flex-wrap gap-2 justify-center">
            {['Spotify', 'Songstats', 'Soundcharts'].map(p => (
              <span key={p} className="text-xs font-bold px-3 py-1.5 rounded-full bg-white border border-blue-100 text-blue-600">
                {p}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Overview metric cards */}
      {!loading && anyData && (
        <div>
          <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Overview</p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {allMetrics.slice(0, 8).map(m => (
              <MetricCard key={m.id} metric={m} />
            ))}
          </div>
        </div>
      )}

      {/* Domain sections */}
      {!loading && (
        <div className="space-y-4">
          {DOMAIN_CONFIG.map(section => {
            const data    = payload[section.key];
            const isOpen  = expanded[section.key] ?? true;
            return (
              <div key={section.key} className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                <SectionHeader
                  icon={section.icon}
                  title={section.title}
                  count={data.length}
                  expanded={isOpen}
                  onToggle={() => toggle(section.key)}
                  badge={section.badge}
                />
                {isOpen && (
                  <div className="p-4">
                    {data.length > 0 ? (
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                        {data.map(m => <MetricCard key={m.id} metric={m} />)}
                      </div>
                    ) : (
                      <EmptySectionState
                        description={section.description}
                        providers={section.providers}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Source attribution / sync status */}
      {!loading && providerStates.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <button
            type="button"
            onClick={() => toggle('status')}
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
            {expanded.status
              ? <ChevronUp   className="w-4 h-4 text-slate-400 shrink-0" />
              : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
          </button>
          {expanded.status && (
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
