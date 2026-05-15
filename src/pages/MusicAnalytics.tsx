import React, { useEffect, useState, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, Music2, Globe, MapPin, Mic2,
  Headphones, Radio, PlayCircle, ListMusic, Newspaper,
  Trophy, Users, Zap, BarChart2, Star,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { fetchReleases } from '../lib/supabaseData';
import type { ReleaseRecord } from '../types/domain';

// ── helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number | null | undefined, compact = true): string {
  if (n == null || isNaN(n)) return '—';
  if (!compact) return n.toLocaleString();
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

function delta(val: number | null | undefined, weekly: number | null | undefined) {
  if (val == null || weekly == null) return null;
  return weekly;
}

function DeltaBadge({ d }: { d: number | null }) {
  if (d == null) return null;
  const up = d >= 0;
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-[10px] font-semibold', up ? 'text-emerald-400' : 'text-rose-400')}>
      {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {up ? '+' : ''}{fmt(d)}
    </span>
  );
}

// ── sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, icon: Icon, color = 'text-brand', d,
}: {
  label: string; value: string; sub?: string; icon: React.ElementType; color?: string; d?: number | null;
}) {
  return (
    <div className="glass-card rounded-2xl p-5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">{label}</span>
        <Icon className={cn('w-4 h-4 opacity-60', color)} />
      </div>
      <p className="text-3xl font-heading font-bold text-text-primary">{value}</p>
      <div className="flex items-center gap-2">
        {sub && <span className="text-xs text-text-muted">{sub}</span>}
        {d != null && <DeltaBadge d={d} />}
      </div>
    </div>
  );
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-bold text-text-primary tracking-tight">{title}</h2>
      {sub && <p className="text-xs text-text-muted mt-0.5">{sub}</p>}
    </div>
  );
}

function PanelCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('glass-card rounded-2xl p-5', className)}>
      {children}
    </div>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-white/5 rounded-lg', className)} />;
}

// ── data hooks ───────────────────────────────────────────────────────────────

function useCmStats() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch('/api/chartmetric/artist/cmstats')
      .then(r => r.ok ? r.json() : null)
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  return { data, loading };
}

function useCmCareer() {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    fetch('/api/chartmetric/artist/career')
      .then(r => r.ok ? r.json() : null)
      .then(d => setData(d))
      .catch(() => {});
  }, []);
  return data;
}

function useCmMilestones() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch('/api/chartmetric/artist/milestones')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const arr = d?.milestones ?? d?.data ?? (Array.isArray(d) ? d : []);
        setData(arr.slice(0, 10));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  return { data, loading };
}

function useCmNews() {
  const [data, setData] = useState<any[]>([]);
  useEffect(() => {
    fetch('/api/chartmetric/artist/news')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const arr = d?.news ?? d?.data ?? (Array.isArray(d) ? d : []);
        setData(arr.slice(0, 8));
      })
      .catch(() => {});
  }, []);
  return data;
}

function usePlaylists() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch('/api/chartmetric/artist/playlists?platform=spotify&status=current&limit=20')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const arr = d?.playlists ?? d?.data ?? (Array.isArray(d) ? d : []);
        setData(arr.slice(0, 12));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  return { data, loading };
}

function useWherePeopleListen() {
  const [data, setData] = useState<any[]>([]);
  useEffect(() => {
    fetch('/api/chartmetric/artist/where-people-listen?latest=true')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const arr = d?.cities ?? d?.data ?? (Array.isArray(d) ? d : []);
        setData(arr.slice(0, 10));
      })
      .catch(() => {});
  }, []);
  return data;
}

function useSpotifyStat() {
  const [data, setData] = useState<any[]>([]);
  useEffect(() => {
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    fetch(`/api/chartmetric/artist/stat/spotify?since=${since}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const arr = d?.data ?? (Array.isArray(d) ? d : []);
        setData(arr);
      })
      .catch(() => {});
  }, []);
  return data;
}

// ── Platform breakdown from releases ────────────────────────────────────────

function useCatalogTotals(releases: ReleaseRecord[]) {
  return useMemo(() => {
    return releases.reduce((acc, t) => ({
      spotify: acc.spotify + (t.performance?.streams?.spotify ?? 0),
      soundcloud: acc.soundcloud + (t.soundcloud_stats?.plays ?? t.performance?.streams?.soundcloud ?? 0),
      youtube: acc.youtube + (t.performance?.streams?.youtube ?? t.youtube_stats?.views ?? 0),
    }), { spotify: 0, soundcloud: 0, youtube: 0 });
  }, [releases]);
}

// ── Mini bar chart (pure CSS) ────────────────────────────────────────────────

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
      <div className={cn('h-full rounded-full', color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ── Trend sparkline (SVG) ────────────────────────────────────────────────────

function Sparkline({ points, color = '#8b5cf6' }: { points: number[]; color?: string }) {
  if (points.length < 2) return null;
  const w = 120, h = 36;
  const min = Math.min(...points), max = Math.max(...points);
  const range = max - min || 1;
  const xs = points.map((_, i) => (i / (points.length - 1)) * w);
  const ys = points.map(v => h - ((v - min) / range) * (h - 4) - 2);
  const d = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="opacity-70">
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Career stage badge ───────────────────────────────────────────────────────

const STAGE_COLOR: Record<string, string> = {
  superstar: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  mainstream: 'text-purple-400 bg-purple-400/10 border-purple-400/30',
  developing: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
  emerging: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
  underground: 'text-slate-400 bg-slate-400/10 border-slate-400/30',
};

function CareerBadge({ stage }: { stage?: string }) {
  if (!stage) return null;
  const key = stage.toLowerCase();
  const color = STAGE_COLOR[key] ?? 'text-text-muted bg-white/5 border-white/10';
  return (
    <span className={cn('px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border', color)}>
      {stage}
    </span>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export function MusicAnalytics() {
  const [releases, setReleases] = useState<ReleaseRecord[]>([]);
  const totals = useCatalogTotals(releases);
  const { data: cmStats, loading: cmLoading } = useCmStats();
  const career = useCmCareer();
  const { data: milestones, loading: msLoading } = useCmMilestones();
  const news = useCmNews();
  const { data: playlists, loading: plLoading } = usePlaylists();
  const cities = useWherePeopleListen();
  const spotifyStat = useSpotifyStat();

  useEffect(() => {
    fetchReleases().then(setReleases).catch(() => {});
  }, []);

  // Pull out key CM stats
  const sp = cmStats?.spotify ?? cmStats?.sp ?? {};
  const sc = cmStats?.soundcloud ?? cmStats?.sc ?? {};
  const yt = cmStats?.youtube_channel ?? cmStats?.yt ?? {};
  const ttk = cmStats?.tiktok ?? {};

  const spFollowers = sp?.followers?.latest ?? sp?.follower_count ?? null;
  const spFollowersDelta = sp?.followers?.weekly_diff ?? null;
  const spListeners = sp?.listeners?.latest ?? sp?.monthly_listeners ?? null;
  const spListenersDelta = sp?.listeners?.weekly_diff ?? null;
  const scFollowers = sc?.followers?.latest ?? sc?.follower_count ?? null;
  const ytSubs = yt?.subscribers?.latest ?? yt?.subscriber_count ?? null;
  const ttkFollowers = ttk?.followers?.latest ?? ttk?.follower_count ?? null;

  const careerStage = career?.career_stage ?? career?.stage ?? career?.data?.career_stage;
  const careerScore = career?.cm_score ?? career?.data?.cm_score;

  // Sparkline points from spotify stat time series
  const sparkPoints = useMemo(() => {
    if (!spotifyStat.length) return [];
    return spotifyStat
      .map((p: any) => p.value ?? p.listeners ?? p.followers ?? 0)
      .slice(-30);
  }, [spotifyStat]);

  const totalPlays = totals.spotify + totals.soundcloud + totals.youtube;
  const platformMax = Math.max(totals.spotify, totals.soundcloud, totals.youtube, 1);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Music Analytics</h1>
          <p className="mt-1 text-sm text-text-muted">
            Catalog performance, fan metrics, and growth trends.
          </p>
        </div>
        {careerStage && (
          <div className="flex flex-col items-end gap-1.5">
            <CareerBadge stage={careerStage} />
            {careerScore != null && (
              <span className="text-[10px] text-text-muted">CM Score: <span className="text-text-primary font-semibold">{careerScore}</span></span>
            )}
          </div>
        )}
      </div>

      {/* Top stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Plays"
          value={fmt(totalPlays)}
          icon={PlayCircle}
          color="text-brand"
          sub={`${releases.length} releases`}
        />
        <StatCard
          label="Spotify Listeners"
          value={fmt(spListeners)}
          icon={Headphones}
          color="text-emerald-400"
          sub="Monthly"
          d={delta(spListeners, spListenersDelta)}
        />
        <StatCard
          label="Spotify Followers"
          value={fmt(spFollowers)}
          icon={Users}
          color="text-purple-400"
          sub="All time"
          d={delta(spFollowers, spFollowersDelta)}
        />
        <StatCard
          label="Playlisted"
          value={plLoading ? '—' : fmt(playlists.length)}
          icon={ListMusic}
          color="text-blue-400"
          sub="Current Spotify playlists"
        />
      </div>

      {/* Platform breakdown + Spotify trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PanelCard>
          <SectionHeader title="Catalog Streams by Platform" sub="All released tracks combined" />
          <div className="space-y-3">
            {[
              { label: 'Spotify', value: totals.spotify, color: 'bg-emerald-500' },
              { label: 'SoundCloud', value: totals.soundcloud, color: 'bg-orange-400' },
              { label: 'YouTube', value: totals.youtube, color: 'bg-red-500' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-xs text-text-muted w-24 shrink-0">{label}</span>
                <MiniBar value={value} max={platformMax} color={color} />
                <span className="text-xs font-semibold text-text-primary w-16 text-right">{fmt(value)}</span>
              </div>
            ))}
          </div>

          <div className="mt-5 pt-4 border-t border-border/30 grid grid-cols-3 gap-3">
            {scFollowers != null && (
              <div className="text-center">
                <p className="text-[10px] text-text-muted uppercase tracking-widest">SC Followers</p>
                <p className="text-lg font-bold text-text-primary mt-0.5">{fmt(scFollowers)}</p>
              </div>
            )}
            {ytSubs != null && (
              <div className="text-center">
                <p className="text-[10px] text-text-muted uppercase tracking-widest">YT Subs</p>
                <p className="text-lg font-bold text-text-primary mt-0.5">{fmt(ytSubs)}</p>
              </div>
            )}
            {ttkFollowers != null && (
              <div className="text-center">
                <p className="text-[10px] text-text-muted uppercase tracking-widest">TikTok</p>
                <p className="text-lg font-bold text-text-primary mt-0.5">{fmt(ttkFollowers)}</p>
              </div>
            )}
          </div>
        </PanelCard>

        <PanelCard>
          <SectionHeader title="Spotify Listener Trend" sub="Last 90 days" />
          {sparkPoints.length > 1 ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-3xl font-heading font-bold text-text-primary">{fmt(spListeners)}</p>
                  <p className="text-xs text-text-muted mt-0.5">Monthly listeners</p>
                </div>
                {spListenersDelta != null && <DeltaBadge d={spListenersDelta} />}
              </div>
              <div className="w-full overflow-hidden">
                <Sparkline
                  points={sparkPoints}
                  color={spListenersDelta != null && spListenersDelta >= 0 ? '#10b981' : '#f43f5e'}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 text-center gap-2">
              <BarChart2 className="w-8 h-8 text-text-muted opacity-30" />
              <p className="text-xs text-text-muted">Trend data loading…</p>
            </div>
          )}
        </PanelCard>
      </div>

      {/* Playlists + Where people listen */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PanelCard>
          <SectionHeader title="Current Spotify Playlists" sub="Active placements" />
          {plLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
            </div>
          ) : playlists.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-24 gap-2 text-center">
              <ListMusic className="w-6 h-6 text-text-muted opacity-30" />
              <p className="text-xs text-text-muted">No playlist placements found</p>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {playlists.map((pl: any, i: number) => (
                <div key={i} className="flex items-center gap-3 py-1.5 px-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer">
                  {pl.image_url ? (
                    <img src={pl.image_url} alt="" className="w-8 h-8 rounded-md object-cover shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-md bg-white/10 flex items-center justify-center shrink-0">
                      <ListMusic className="w-4 h-4 text-text-muted" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-text-primary truncate">{pl.name ?? pl.playlist_name}</p>
                    {pl.followers != null && (
                      <p className="text-[10px] text-text-muted">{fmt(pl.followers)} followers</p>
                    )}
                  </div>
                  {pl.position != null && (
                    <span className="text-[10px] font-bold text-brand">#{pl.position}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </PanelCard>

        <PanelCard>
          <SectionHeader title="Where People Listen" sub="Top Spotify listener cities" />
          {cities.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-24 gap-2">
              <Globe className="w-6 h-6 text-text-muted opacity-30" />
              <p className="text-xs text-text-muted">Geography data loading…</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {cities.map((c: any, i: number) => {
                const listeners = c.listeners ?? c.value ?? c.monthly_listeners ?? 0;
                const maxListeners = cities[0] ? (cities[0].listeners ?? cities[0].value ?? cities[0].monthly_listeners ?? 1) : 1;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <MapPin className="w-3 h-3 text-text-muted shrink-0" />
                    <span className="text-xs text-text-muted w-32 truncate shrink-0">
                      {c.city ?? c.name}, {c.country ?? c.country_code ?? ''}
                    </span>
                    <MiniBar value={listeners} max={maxListeners} color="bg-brand" />
                    <span className="text-xs font-semibold text-text-primary w-12 text-right">{fmt(listeners)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </PanelCard>
      </div>

      {/* Top tracks from catalog */}
      <PanelCard>
        <SectionHeader title="Top Tracks by Streams" sub="From your catalog" />
        {releases.length === 0 ? (
          <div className="flex items-center justify-center h-20">
            <p className="text-xs text-text-muted">Loading catalog…</p>
          </div>
        ) : (
          <div className="space-y-1">
            {releases
              .map(r => ({
                title: r.title,
                spotify: r.performance?.streams?.spotify ?? 0,
                soundcloud: r.soundcloud_stats?.plays ?? r.performance?.streams?.soundcloud ?? 0,
                youtube: r.performance?.streams?.youtube ?? r.youtube_stats?.views ?? 0,
                cover: r.cover_art_url,
              }))
              .sort((a, b) => (b.spotify + b.soundcloud + b.youtube) - (a.spotify + a.soundcloud + a.youtube))
              .slice(0, 10)
              .map((t, i) => {
                const total = t.spotify + t.soundcloud + t.youtube;
                const maxTotal = releases.reduce((m, r) => {
                  const s = (r.performance?.streams?.spotify ?? 0) + (r.soundcloud_stats?.plays ?? 0) + (r.performance?.streams?.youtube ?? 0);
                  return Math.max(m, s);
                }, 1);
                return (
                  <div key={i} className="flex items-center gap-3 py-2 px-2 rounded-xl hover:bg-white/5 transition-colors">
                    <span className="text-[11px] font-bold text-text-muted w-5 text-right shrink-0">{i + 1}</span>
                    {t.cover ? (
                      <img src={t.cover} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-white/10 shrink-0 flex items-center justify-center">
                        <Music2 className="w-4 h-4 text-text-muted" />
                      </div>
                    )}
                    <span className="flex-1 text-xs font-semibold text-text-primary truncate">{t.title}</span>
                    <MiniBar value={total} max={maxTotal} color="bg-brand/60" />
                    <span className="text-xs font-bold text-text-primary w-14 text-right">{fmt(total)}</span>
                  </div>
                );
              })}
          </div>
        )}
      </PanelCard>

      {/* Milestones + News */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PanelCard>
          <SectionHeader title="Milestones" sub="Career achievements" />
          {msLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : milestones.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-24 gap-2">
              <Trophy className="w-6 h-6 text-text-muted opacity-30" />
              <p className="text-xs text-text-muted">No milestones yet</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {milestones.map((m: any, i: number) => (
                <div key={i} className="flex gap-3 py-2 px-2 rounded-xl hover:bg-white/5 transition-colors">
                  <Trophy className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-text-primary leading-snug">{m.description ?? m.event ?? m.title ?? JSON.stringify(m)}</p>
                    {m.timestp && (
                      <p className="text-[10px] text-text-muted mt-0.5">{new Date(m.timestp).toLocaleDateString()}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </PanelCard>

        <PanelCard>
          <SectionHeader title="News & Highlights" sub="Recent coverage" />
          {news.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-24 gap-2">
              <Newspaper className="w-6 h-6 text-text-muted opacity-30" />
              <p className="text-xs text-text-muted">No news items</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {news.map((n: any, i: number) => (
                <a
                  key={i}
                  href={n.url ?? '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex gap-3 py-2 px-2 rounded-xl hover:bg-white/5 transition-colors block"
                >
                  <Newspaper className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-text-primary leading-snug line-clamp-2">{n.title ?? n.description}</p>
                    <p className="text-[10px] text-text-muted mt-0.5">{n.source ?? n.publisher ?? ''}</p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </PanelCard>
      </div>
    </div>
  );
}
