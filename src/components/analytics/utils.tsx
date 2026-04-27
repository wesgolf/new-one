/**
 * Shared analytics utilities and small interactive components.
 * Used by MusicAnalyticsView and SocialAnalyticsView.
 */
import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Globe,
  Search,
  Settings,
  X,
  XCircle,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { cn } from '../../lib/utils';
import type {
  AnalyticsProviderState,
  PlatformSnapshot,
} from '../../types/domain';

// ── Formatters ────────────────────────────────────────────────────────────────

export function formatNumber(n: number | undefined | null): string {
  if (n == null || isNaN(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
  if (abs >= 1_000_000)     return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (abs >= 1_000)         return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return Math.round(n).toLocaleString();
}

export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function timeAgo(iso?: string): string {
  if (!iso) return '—';
  const ms = Date.now() - new Date(iso).getTime();
  if (isNaN(ms)) return '—';
  const min = Math.floor(ms / 60000);
  if (min < 1)    return 'just now';
  if (min < 60)   return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24)    return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  if (d < 30)     return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

// ── Hero KPI strip ────────────────────────────────────────────────────────────

export interface HeroKpi {
  id: string;
  label: string;
  value: number;
  unit?: string;
  icon: React.ReactNode;
  accent: string;
  caption?: string;
}

export function HeroStrip({ kpis }: { kpis: HeroKpi[] }) {
  if (kpis.length === 0) return null;
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {kpis.map(kpi => (
        <div
          key={kpi.id}
          className="group relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div
            className="absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-10 blur-2xl transition-opacity group-hover:opacity-20"
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
            {kpi.unit && <span className="text-base font-bold text-slate-400 ml-1">{kpi.unit}</span>}
          </p>
          {kpi.caption && (
            <p className="relative mt-1 text-[11px] font-medium text-slate-400">{kpi.caption}</p>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Interactive platform card ─────────────────────────────────────────────────

export function PlatformCard({
  platform,
  rank,
  selected,
  dimmed,
  onClick,
}: {
  platform: PlatformSnapshot;
  rank: number;
  selected: boolean;
  dimmed: boolean;
  onClick: () => void;
}) {
  const { brandColor } = platform;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative w-full overflow-hidden rounded-3xl border bg-white p-5 text-left shadow-sm transition-all',
        'hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        selected
          ? 'border-transparent ring-2 shadow-lg'
          : 'border-slate-100',
        dimmed && !selected && 'opacity-40 hover:opacity-100',
      )}
      style={selected ? { boxShadow: `0 8px 24px ${hexToRgba(brandColor, 0.25)}` } as any : undefined}
    >
      <div
        className={cn('absolute inset-x-0 top-0 transition-all', selected ? 'h-1.5' : 'h-1')}
        style={{ background: brandColor }}
      />
      {selected && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ boxShadow: `inset 0 0 0 2px ${brandColor}`, borderRadius: 24 }}
        />
      )}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-black text-white shadow-sm"
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
            style={{ background: hexToRgba(brandColor, 0.12), color: brandColor }}
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

      <div
        className={cn(
          'mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[10px] font-bold uppercase tracking-widest transition-colors',
          selected ? '' : 'text-slate-400 group-hover:text-slate-600',
        )}
        style={selected ? { color: brandColor } : undefined}
      >
        <span>{selected ? 'Focused' : 'Click to focus'}</span>
        <ChevronDown
          className={cn('h-3 w-3 transition-transform', selected && 'rotate-180')}
        />
      </div>
    </button>
  );
}

// ── Expanded platform detail panel ────────────────────────────────────────────

export function PlatformDetailPanel({
  platform,
  onClose,
}: {
  platform: PlatformSnapshot;
  onClose: () => void;
}) {
  const allMetrics = [
    ...(platform.primary ? [platform.primary] : []),
    ...platform.secondary,
  ];

  const extras: { label: string; value: number }[] = [];
  if (platform.audienceSize)    extras.push({ label: 'Audience Size',  value: platform.audienceSize });
  if (platform.totalPlaylists)  extras.push({ label: 'Total Playlists', value: platform.totalPlaylists });
  if (platform.playlistReach)   extras.push({ label: 'Playlist Reach', value: platform.playlistReach });
  if (platform.editorialCount)  extras.push({ label: 'Editorial Lists', value: platform.editorialCount });
  if (platform.chartsCount)     extras.push({ label: 'Active Charts',  value: platform.chartsCount });
  if (platform.chartedTracks)   extras.push({ label: 'Charted Tracks', value: platform.chartedTracks });

  return (
    <div
      className="relative overflow-hidden rounded-3xl border-2 bg-white p-6 shadow-md"
      style={{ borderColor: platform.brandColor }}
    >
      <div
        className="absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-10 blur-3xl"
        style={{ background: platform.brandColor }}
      />
      <div className="relative flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl text-base font-black text-white shadow-md"
            style={{ background: platform.brandColor }}
          >
            {platform.label.charAt(0)}
          </div>
          <div>
            <p className="text-lg font-black text-slate-900">{platform.label}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Detailed metrics
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-50 hover:text-slate-700"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="relative mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {allMetrics.map((m, i) => (
          <div
            key={i}
            className="rounded-2xl border border-slate-100 p-3 transition hover:border-slate-200"
            style={{ background: hexToRgba(platform.brandColor, 0.03) }}
          >
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 truncate">
              {m.label}
            </p>
            <p className="mt-1 text-xl font-black tabular-nums text-slate-900">
              {formatNumber(m.value)}
              {m.unit && <span className="text-xs text-slate-400 ml-1">{m.unit}</span>}
            </p>
          </div>
        ))}
        {extras.map((e, i) => (
          <div
            key={`extra-${i}`}
            className="rounded-2xl border border-slate-100 p-3 transition hover:border-slate-200"
            style={{ background: hexToRgba(platform.brandColor, 0.03) }}
          >
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 truncate">
              {e.label}
            </p>
            <p className="mt-1 text-xl font-black tabular-nums text-slate-900">
              {formatNumber(e.value)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Audience donut (interactive) ──────────────────────────────────────────────

export function AudienceDonut({
  platforms,
  highlightedId,
  onHighlight,
  onSelect,
}: {
  platforms: PlatformSnapshot[];
  highlightedId: string | null;
  onHighlight: (id: string | null) => void;
  onSelect: (id: string) => void;
}) {
  const data = useMemo(
    () =>
      platforms
        .filter(p => p.audienceSize > 0)
        .map(p => ({
          id: p.id,
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

  const focused = highlightedId ? data.find(d => d.id === highlightedId) : null;

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
      <p className="text-sm font-black text-slate-900">Audience Distribution</p>
      <p className="mt-1 text-[11px] text-slate-400">
        {focused
          ? `${focused.name}: ${formatNumber(focused.value)} (${((focused.value / total) * 100).toFixed(1)}%)`
          : 'Hover or click slices to drill in'}
      </p>

      <div className="mt-4 flex min-w-0 flex-col items-center gap-4 sm:flex-row">
        <div className="relative h-44 w-44 shrink-0 min-w-[11rem] min-h-[11rem]">
          <PieChart width={176} height={176}>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx={88}
              cy={88}
              innerRadius={55}
              outerRadius={78}
              paddingAngle={2}
              stroke="none"
              onMouseEnter={(_, i) => onHighlight(data[i]?.id ?? null)}
              onMouseLeave={() => onHighlight(null)}
              onClick={(_, i) => onSelect(data[i]?.id)}
            >
              {data.map(d => (
                <Cell
                  key={d.id}
                  fill={d.color}
                  fillOpacity={highlightedId == null || highlightedId === d.id ? 1 : 0.3}
                  style={{ cursor: 'pointer', transition: 'fill-opacity 150ms' }}
                />
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
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Total</p>
            <p className="text-xl font-black tabular-nums text-slate-900">{formatNumber(total)}</p>
          </div>
        </div>

        <ul className="flex-1 space-y-2 w-full">
          {data.slice(0, 6).map(d => {
            const pct = total > 0 ? (d.value / total) * 100 : 0;
            const isHi = highlightedId === d.id;
            return (
              <li
                key={d.id}
                onMouseEnter={() => onHighlight(d.id)}
                onMouseLeave={() => onHighlight(null)}
                onClick={() => onSelect(d.id)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-2 py-1 cursor-pointer transition-colors',
                  isHi ? 'bg-slate-50' : 'hover:bg-slate-50',
                )}
              >
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

// ── Sortable playlist leaderboard ─────────────────────────────────────────────

type LeaderboardSortKey = 'reach' | 'playlists' | 'editorial';

export function PlaylistLeaderboard({
  platforms,
  highlightedId,
  onSelect,
}: {
  platforms: PlatformSnapshot[];
  highlightedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [sortKey, setSortKey] = useState<LeaderboardSortKey>('reach');
  const [desc, setDesc]       = useState(true);

  const rows = useMemo(() => {
    const base = platforms
      .filter(p => (p.totalPlaylists ?? 0) > 0 || (p.playlistReach ?? 0) > 0)
      .map(p => ({
        id: p.id,
        label: p.label,
        color: p.brandColor,
        playlists: p.totalPlaylists ?? 0,
        reach:     p.playlistReach  ?? 0,
        editorial: p.editorialCount ?? 0,
      }));
    base.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      return desc ? bv - av : av - bv;
    });
    return base;
  }, [platforms, sortKey, desc]);

  if (rows.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <p className="text-sm font-black text-slate-900">Playlist Leaderboard</p>
        <p className="mt-2 text-xs text-slate-400">No playlist data available.</p>
      </div>
    );
  }

  const maxBar = Math.max(...rows.map(r => r[sortKey] || 1), 1);

  function toggleSort(key: LeaderboardSortKey) {
    if (sortKey === key) setDesc(d => !d);
    else { setSortKey(key); setDesc(true); }
  }

  function SortHeader({ k, label }: { k: LeaderboardSortKey; label: string }) {
    const active = sortKey === k;
    return (
      <button
        type="button"
        onClick={() => toggleSort(k)}
        className={cn(
          'flex items-center gap-1 text-[10px] font-black uppercase tracking-widest transition-colors',
          active ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600',
        )}
      >
        {label}
        {active && (desc ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />)}
      </button>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-black text-slate-900">Playlist Leaderboard</p>
        <div className="flex items-center gap-3">
          <SortHeader k="reach"     label="Reach" />
          <SortHeader k="playlists" label="Lists" />
          <SortHeader k="editorial" label="Editorial" />
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {rows.map((r, i) => {
          const v = r[sortKey];
          const pct = (v / maxBar) * 100;
          const isHi = highlightedId === r.id;
          return (
            <div
              key={r.id}
              onClick={() => onSelect(r.id)}
              className={cn(
                'group cursor-pointer rounded-xl p-2 -mx-2 transition-colors',
                isHi ? 'bg-slate-50' : 'hover:bg-slate-50',
              )}
            >
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
                <div className="flex items-center gap-3 shrink-0 tabular-nums text-slate-500 text-[11px]">
                  <span>{formatNumber(r.playlists)} <span className="text-slate-400">lists</span></span>
                  <span>{formatNumber(r.reach)} <span className="text-slate-400">reach</span></span>
                </div>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full transition-all"
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

// ── Search input ──────────────────────────────────────────────────────────────

export function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative flex-1 min-w-[200px]">
      <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder ?? 'Search…'}
        className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs font-bold text-slate-700 placeholder:text-slate-400 focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-100"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

// ── Filter chips ──────────────────────────────────────────────────────────────

export function FilterChips({
  options,
  active,
  onToggle,
}: {
  options: { id: string; label: string; color: string }[];
  active: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(o => {
        const on = active.has(o.id);
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onToggle(o.id)}
            className={cn(
              'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold transition-colors',
              on
                ? 'border-transparent text-white shadow-sm'
                : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700',
            )}
            style={on ? { background: o.color } : undefined}
          >
            <span
              className={cn('h-1.5 w-1.5 rounded-full transition-colors', on ? 'bg-white' : '')}
              style={on ? undefined : { background: o.color }}
            />
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Source attribution row ────────────────────────────────────────────────────

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

export function ProviderStatusRow({ state }: { state: AnalyticsProviderState }) {
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
