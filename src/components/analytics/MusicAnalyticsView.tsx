/**
 * Music Analytics — Spotify, Apple Music, SoundCloud, YouTube and Songstats DJ platforms.
 * Interactive: search, filter chips, click-to-focus platform cards, sortable leaderboard,
 * synchronized highlight between donut chart and leaderboard.
 */
import React, { useMemo, useState } from 'react';
import {
  Activity,
  BarChart2,
  Globe,
  Headphones,
  LayoutGrid,
  ListMusic,
  RefreshCw,
  Rows,
  Trophy,
  Zap,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { ApiErrorBanner } from '../ApiErrorBanner';
import { useAnalytics } from '../../hooks/useAnalytics';
import {
  formatNumber,
  hexToRgba,
  HeroStrip,
  type HeroKpi,
  PlatformCard,
  PlatformDetailPanel,
  AudienceDonut,
  PlaylistLeaderboard,
  SearchInput,
  FilterChips,
  ProviderStatusRow,
} from './utils';
import type { PlatformSnapshot } from '../../types/domain';

// IDs we consider "music" (everything streaming/DJ + YouTube as a music channel)
const MUSIC_IDS = new Set([
  'spotify', 'apple_music', 'soundcloud', 'youtube',
  'shazam', 'beatport', 'traxsource', 'tracklist', 'tidal', 'deezer',
]);

export const MusicAnalyticsView: React.FC = () => {
  const { payload, providerStates, loading, error, refresh } = useAnalytics();

  const allMusicPlatforms = useMemo(
    () =>
      (payload.platforms ?? [])
        .filter(p => MUSIC_IDS.has(p.id))
        .slice()
        .sort((a, b) => b.audienceSize - a.audienceSize),
    [payload.platforms],
  );

  // ── Interactive state ──────────────────────────────────────────────────────
  const [search, setSearch]                       = useState('');
  const [activeIds, setActiveIds]                 = useState<Set<string>>(new Set());
  const [view, setView]                           = useState<'grid' | 'list'>('grid');
  const [selectedId, setSelectedId]               = useState<string | null>(null);
  const [highlightedId, setHighlightedId]         = useState<string | null>(null);

  // Initialize chip set from data on first load
  React.useEffect(() => {
    if (allMusicPlatforms.length > 0 && activeIds.size === 0) {
      setActiveIds(new Set(allMusicPlatforms.map(p => p.id)));
    }
  }, [allMusicPlatforms, activeIds.size]);

  function toggleChip(id: string) {
    setActiveIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // Apply search + chip filters
  const visiblePlatforms = useMemo(
    () =>
      allMusicPlatforms.filter(p => {
        if (activeIds.size > 0 && !activeIds.has(p.id)) return false;
        if (search.trim() && !p.label.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      }),
    [allMusicPlatforms, activeIds, search],
  );

  const selectedPlatform = selectedId ? allMusicPlatforms.find(p => p.id === selectedId) ?? null : null;

  // ── Hero KPIs (computed from visible/all platforms) ────────────────────────
  const heroKpis = useMemo<HeroKpi[]>(() => {
    const totalReach       = visiblePlatforms.reduce((s, p) => s + p.audienceSize, 0);
    const monthlyListeners = visiblePlatforms.find(p => p.id === 'spotify')?.primary?.value ?? 0;
    const totalStreams     = payload.streaming.find(m => m.id === 'sp_streams')?.value ?? 0;
    const djCharts         = (payload.playlist.find(m => m.id === 'bp_dj_charts')?.value ?? 0)
                           + (payload.playlist.find(m => m.id === 'tx_dj_charts')?.value ?? 0);

    return [
      { id: 'reach',    label: 'Total Reach',       value: totalReach,       icon: <Globe       className="h-4 w-4" />, accent: '#6366F1', caption: `${visiblePlatforms.length} platforms` },
      { id: 'monthly',  label: 'Monthly Listeners', value: monthlyListeners, icon: <Headphones  className="h-4 w-4" />, accent: '#1DB954', caption: 'Spotify' },
      { id: 'streams',  label: 'Total Streams',     value: totalStreams,     icon: <BarChart2   className="h-4 w-4" />, accent: '#FA243C', caption: 'All-time' },
      { id: 'dj',       label: 'DJ Charts',         value: djCharts,         icon: <Trophy      className="h-4 w-4" />, accent: '#00FF95', caption: 'Beatport + Traxsource' },
    ];
  }, [visiblePlatforms, payload]);

  const chipOptions = allMusicPlatforms.map(p => ({ id: p.id, label: p.label, color: p.brandColor }));
  const anyData = allMusicPlatforms.length > 0;
  const musicProviderStates = providerStates.filter(s =>
    /songstats|spotify|soundcloud|apple/i.test(s.provider),
  );

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-xs">
          <Activity className="h-4 w-4 text-slate-500" />
          <span className="font-black uppercase tracking-widest text-slate-500">Music</span>
          <span className="font-bold text-slate-400">
            {visiblePlatforms.length} of {allMusicPlatforms.length} platforms
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
            Refresh
          </button>
        </div>
      </div>

      {error && <ApiErrorBanner error={error} onRetry={refresh} onDismiss={() => {}} />}

      {!loading && !anyData && (
        <div className="rounded-3xl border border-dashed border-blue-200 bg-blue-50/40 p-8 flex flex-col items-center text-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white border border-blue-100 shadow-sm">
            <Zap className="w-7 h-7 text-blue-500" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Connect your music analytics</h3>
            <p className="text-sm text-slate-500 max-w-md mt-2">
              Set <code className="bg-white px-1.5 py-0.5 rounded text-xs">VITE_SONGSTATS_ARTIST_ID</code> to populate Spotify, Apple Music, SoundCloud, YouTube and DJ platform stats.
            </p>
          </div>
        </div>
      )}

      {anyData && (
        <>
          <HeroStrip kpis={heroKpis} />

          {/* Interactive controls */}
          <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm flex flex-col gap-3 lg:flex-row lg:items-center">
            <SearchInput value={search} onChange={setSearch} placeholder="Search platforms…" />
            <div className="flex-1 overflow-x-auto">
              <FilterChips options={chipOptions} active={activeIds} onToggle={toggleChip} />
            </div>
            <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 shrink-0">
              <button
                type="button"
                onClick={() => setView('grid')}
                className={cn(
                  'flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors',
                  view === 'grid' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500',
                )}
              >
                <LayoutGrid className="h-3 w-3" /> Grid
              </button>
              <button
                type="button"
                onClick={() => setView('list')}
                className={cn(
                  'flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors',
                  view === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500',
                )}
              >
                <Rows className="h-3 w-3" /> List
              </button>
            </div>
          </div>

          {/* Platform grid / list */}
          {view === 'grid' ? (
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visiblePlatforms.map((p, i) => (
                <PlatformCard
                  key={p.id}
                  platform={p}
                  rank={allMusicPlatforms.indexOf(p) + 1}
                  selected={selectedId === p.id}
                  dimmed={highlightedId !== null && highlightedId !== p.id}
                  onClick={() => setSelectedId(s => s === p.id ? null : p.id)}
                />
              ))}
            </section>
          ) : (
            <CompactPlatformList
              platforms={visiblePlatforms}
              selectedId={selectedId}
              highlightedId={highlightedId}
              onSelect={(id) => setSelectedId(s => s === id ? null : id)}
            />
          )}

          {selectedPlatform && (
            <PlatformDetailPanel
              platform={selectedPlatform}
              onClose={() => setSelectedId(null)}
            />
          )}

          {/* Donut + leaderboard with shared highlight */}
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <AudienceDonut
              platforms={visiblePlatforms}
              highlightedId={highlightedId}
              onHighlight={setHighlightedId}
              onSelect={setSelectedId}
            />
            <PlaylistLeaderboard
              platforms={visiblePlatforms}
              highlightedId={highlightedId}
              onSelect={setSelectedId}
            />
          </section>

          <ChartsPresence
            platforms={visiblePlatforms}
            highlightedId={highlightedId}
            onSelect={setSelectedId}
          />
        </>
      )}

      {/* Source attribution */}
      {!loading && musicProviderStates.length > 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Globe className="h-4 w-4 text-slate-500" />
            <p className="text-sm font-bold text-slate-900">Music Sources</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {musicProviderStates.map(s => <ProviderStatusRow key={s.provider} state={s} />)}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Compact list view ─────────────────────────────────────────────────────────

function CompactPlatformList({
  platforms,
  selectedId,
  highlightedId,
  onSelect,
}: {
  platforms: PlatformSnapshot[];
  selectedId: string | null;
  highlightedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <table className="w-full text-xs">
        <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-500">
          <tr>
            <th className="text-left px-4 py-2">Platform</th>
            <th className="text-right px-4 py-2">Primary</th>
            <th className="text-right px-4 py-2 hidden sm:table-cell">Audience</th>
            <th className="text-right px-4 py-2 hidden md:table-cell">Playlists</th>
            <th className="text-right px-4 py-2 hidden lg:table-cell">Charts</th>
          </tr>
        </thead>
        <tbody>
          {platforms.map(p => {
            const isSel = selectedId === p.id;
            const isHi  = highlightedId === p.id;
            return (
              <tr
                key={p.id}
                onClick={() => onSelect(p.id)}
                className={cn(
                  'cursor-pointer border-t border-slate-100 transition-colors',
                  isSel ? 'bg-slate-50' : isHi ? 'bg-slate-50/60' : 'hover:bg-slate-50',
                )}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-6 w-6 shrink-0 rounded-lg flex items-center justify-center text-[10px] font-black text-white"
                      style={{ background: p.brandColor }}
                    >
                      {p.label.charAt(0)}
                    </span>
                    <span className="font-bold text-slate-900">{p.label}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-bold text-slate-700">
                  {p.primary ? `${formatNumber(p.primary.value)}${p.primary.unit ?? ''}` : '—'}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-600 hidden sm:table-cell">
                  {formatNumber(p.audienceSize) || '—'}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-600 hidden md:table-cell">
                  {p.totalPlaylists ? formatNumber(p.totalPlaylists) : '—'}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-600 hidden lg:table-cell">
                  {p.chartsCount ? formatNumber(p.chartsCount) : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Charts presence (interactive) ─────────────────────────────────────────────

function ChartsPresence({
  platforms,
  highlightedId,
  onSelect,
}: {
  platforms: PlatformSnapshot[];
  highlightedId: string | null;
  onSelect: (id: string) => void;
}) {
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
      <p className="mt-1 text-[11px] text-slate-400">Click a platform to drill in</p>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {rows.map(r => {
          const isHi = highlightedId === r.id;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => onSelect(r.id)}
              className={cn(
                'rounded-2xl border p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-sm',
                isHi ? 'border-slate-300' : 'border-slate-100',
              )}
              style={{ background: hexToRgba(r.color, 0.04) }}
            >
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: r.color }} />
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
            </button>
          );
        })}
      </div>
    </div>
  );
}
