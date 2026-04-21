/**
 * Social Analytics — Zernio-driven (Instagram, TikTok, YouTube, etc.)
 * Data sourced entirely from Zernio: follower stats, post analytics, and account data.
 * Interactive: search, filter chips, account cards, sortable post table, donut.
 */
import React, { useMemo, useState, useEffect } from 'react';
import {
  Activity,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Eye,
  Globe,
  Heart,
  MessageCircle,
  RefreshCw,
  Search,
  Settings,
  Share2,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useZernioAnalytics } from '../../hooks/useZernioAnalytics';
import {
  formatNumber,
  hexToRgba,
  HeroStrip,
  type HeroKpi,
  AudienceDonut,
  SearchInput,
  FilterChips,
  timeAgo,
} from './utils';
import type { PlatformSnapshot } from '../../types/domain';
import type {
  ZernioAccount,
  ZernioPost,
  ZernioBestTimeSlot,
  ZernioContentDecayBucket,
  ZernioPostingFrequencyRow,
  ZernioPlatformBreakdown,
  ZernioDailyMetricsDay,
} from '../../services/zernioAnalyticsService';

const PLATFORM_COLORS: Record<string, string> = {
  instagram: '#E1306C',
  tiktok:    '#000000',
  youtube:   '#FF0000',
  twitter:   '#0F0F0F',
  x:         '#0F0F0F',
  facebook:  '#1877F2',
  threads:   '#000000',
  linkedin:  '#0A66C2',
  unknown:   '#94A3B8',
};

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

const colorOf = (id: string) => PLATFORM_COLORS[id] ?? PLATFORM_COLORS.unknown;
const labelOf = (id: string) => PLATFORM_LABELS[id] ?? (id.charAt(0).toUpperCase() + id.slice(1));

type PostSortKey = 'date' | 'likes' | 'comments' | 'views' | 'engagement';

export const SocialAnalyticsView: React.FC = () => {
  const { snapshot, loading, error, refresh } = useZernioAnalytics();

  const accounts = snapshot?.accounts ?? [];
  const posts    = snapshot?.posts    ?? [];

  // Build per-platform snapshot from Zernio follower stats + account data
  const platformSnapshots: PlatformSnapshot[] = useMemo(() => {
    const map = new Map<string, PlatformSnapshot>();

    // Primary: Zernio follower stats (accurate per-account follower counts with growth)
    for (const fa of (snapshot?.followerStats?.accounts ?? [])) {
      const pid = fa.platform.toLowerCase();
      const existing = map.get(pid);
      if (existing) {
        existing.audienceSize += fa.currentFollowers;
        existing.primary = { label: 'Followers', value: existing.audienceSize };
      } else {
        map.set(pid, {
          id:          pid,
          label:       labelOf(pid),
          brandColor:  colorOf(pid),
          category:    'social',
          primary:     { label: 'Followers', value: fa.currentFollowers },
          secondary:   fa.growth !== 0 ? [{ label: 'Growth', value: fa.growth }] : [],
          audienceSize: fa.currentFollowers,
        });
      }
    }

    // Secondary: Zernio account data (fills in platforms not in follower stats)
    const zAccountMap = new Map<string, ZernioAccount[]>();
    for (const a of accounts) {
      const arr = zAccountMap.get(a.platform) ?? [];
      arr.push(a);
      zAccountMap.set(a.platform, arr);
    }
    for (const [pid, accts] of zAccountMap) {
      const followers  = accts.reduce((s, a) => s + (a.followers ?? 0), 0);
      const totalPosts = accts.reduce((s, a) => s + (a.posts ?? 0), 0);
      const existing   = map.get(pid);
      if (existing) {
        if (totalPosts > 0) {
          existing.secondary = [...existing.secondary, { label: 'Posts', value: totalPosts }];
        }
      } else {
        map.set(pid, {
          id:          pid,
          label:       labelOf(pid),
          brandColor:  colorOf(pid),
          category:    'social',
          primary:     followers > 0 ? { label: 'Followers', value: followers } : null,
          secondary:   totalPosts > 0 ? [{ label: 'Posts', value: totalPosts }] : [],
          audienceSize: followers,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.audienceSize - a.audienceSize);
  }, [snapshot?.followerStats, accounts]);

  // ── Interactive state ──────────────────────────────────────────────────────
  const [search, setSearch]           = useState('');
  const [activeIds, setActiveIds]     = useState<Set<string>>(new Set());
  const [highlightedId, setHl]        = useState<string | null>(null);
  const [selectedAcct, setSelectedAcct] = useState<string | null>(null);
  const [postSort, setPostSort]       = useState<PostSortKey>('date');
  const [postSortDesc, setPostSortDesc] = useState(true);

  useEffect(() => {
    if (platformSnapshots.length > 0 && activeIds.size === 0) {
      setActiveIds(new Set(platformSnapshots.map(p => p.id)));
    }
  }, [platformSnapshots, activeIds.size]);

  function toggleChip(id: string) {
    setActiveIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // Filtered accounts + posts
  const visibleAccounts = useMemo(
    () =>
      accounts.filter(a => {
        if (activeIds.size > 0 && !activeIds.has(a.platform)) return false;
        if (search.trim() && !a.username.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      }),
    [accounts, activeIds, search],
  );

  const visiblePosts = useMemo(() => {
    const filtered = posts.filter(p => {
      if (activeIds.size > 0 && !activeIds.has(p.platform)) return false;
      if (selectedAcct && p.raw?.accountId !== selectedAcct && p.raw?.account_id !== selectedAcct) return false;
      if (search.trim() && !(p.caption ?? '').toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
    filtered.sort((a, b) => {
      let av: any, bv: any;
      switch (postSort) {
        case 'date':       av = new Date(a.publishedAt ?? 0).getTime(); bv = new Date(b.publishedAt ?? 0).getTime(); break;
        case 'likes':      av = a.likes      ?? 0; bv = b.likes      ?? 0; break;
        case 'comments':   av = a.comments   ?? 0; bv = b.comments   ?? 0; break;
        case 'views':      av = a.views      ?? 0; bv = b.views      ?? 0; break;
        case 'engagement': av = a.engagement ?? 0; bv = b.engagement ?? 0; break;
      }
      return postSortDesc ? bv - av : av - bv;
    });
    return filtered;
  }, [posts, activeIds, selectedAcct, search, postSort, postSortDesc]);

  // ── Hero KPIs ──────────────────────────────────────────────────────────────
  const heroKpis = useMemo<HeroKpi[]>(() => {
    const totalFollowers = platformSnapshots
      .filter(p => activeIds.size === 0 || activeIds.has(p.id))
      .reduce((s, p) => s + p.audienceSize, 0);
    const totalPostsCount = visiblePosts.length;
    const engagementSum   = visiblePosts.reduce((s, p) => s + (p.engagement ?? 0), 0);
    const avgEngagement   = visiblePosts.length > 0 ? engagementSum / visiblePosts.length : 0;
    const totalViews      = visiblePosts.reduce((s, p) => s + (p.views ?? 0), 0);

    return [
      { id: 'followers',  label: 'Total Followers', value: totalFollowers,  icon: <Users      className="h-4 w-4" />, accent: '#E1306C', caption: `${platformSnapshots.length} platforms` },
      { id: 'accounts',   label: 'Active Accounts', value: visibleAccounts.length, icon: <Activity className="h-4 w-4" />, accent: '#1877F2', caption: 'Connected via Zernio' },
      { id: 'views',      label: 'Total Views',     value: totalViews,      icon: <Eye        className="h-4 w-4" />, accent: '#FF0000', caption: `${totalPostsCount} posts` },
      { id: 'engagement', label: 'Avg Engagement',  value: avgEngagement, unit: '%', icon: <TrendingUp className="h-4 w-4" />, accent: '#10B981', caption: avgEngagement > 0 ? 'Across recent posts' : 'No data' },
    ];
  }, [platformSnapshots, activeIds, visiblePosts, visibleAccounts]);

  const chipOptions = platformSnapshots.map(p => ({ id: p.id, label: p.label, color: p.brandColor }));
  const visiblePlatforms = platformSnapshots.filter(p => activeIds.size === 0 || activeIds.has(p.id));

  // ── Render branches ────────────────────────────────────────────────────────

  if (snapshot && !snapshot.configured) {
    return (
      <div className="rounded-3xl border border-dashed border-amber-200 bg-amber-50/40 p-8 flex flex-col items-center text-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white border border-amber-100 shadow-sm">
          <Settings className="w-7 h-7 text-amber-600" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">Connect Zernio</h3>
          <p className="text-sm text-slate-500 max-w-md mt-2">
            {snapshot.error ?? 'Set ZERNIO_API_KEY to pull Instagram, TikTok and YouTube account analytics.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-xs">
          <Globe className="h-4 w-4 text-slate-500" />
          <span className="font-black uppercase tracking-widest text-slate-500">Social</span>
          <span className="font-bold text-slate-400">
            {visibleAccounts.length} accounts • {visiblePosts.length} posts
          </span>
        </div>
        <div className="flex items-center gap-2">
          {snapshot?.fetchedAt && (
            <span className="text-[10px] font-bold text-slate-400">
              Synced {timeAgo(snapshot.fetchedAt)}
            </span>
          )}
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

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
          {error.message}
        </div>
      )}
      {snapshot?.endpointErrors && snapshot.endpointErrors.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-black text-amber-700 mb-1">Zernio endpoint errors — check browser console for raw responses:</p>
          <ul className="list-disc list-inside space-y-0.5">
            {snapshot.endpointErrors.map(e => (
              <li key={e} className="text-[11px] text-amber-700 font-mono">{e}</li>
            ))}
          </ul>
        </div>
      )}

      {!loading && accounts.length === 0 && platformSnapshots.length === 0 && (
        <div className="rounded-3xl border border-dashed border-blue-200 bg-blue-50/40 p-8 flex flex-col items-center text-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white border border-blue-100 shadow-sm">
            <Zap className="w-7 h-7 text-blue-500" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">No social accounts connected</h3>
            <p className="text-sm text-slate-500 max-w-md mt-2">
              Connect your Instagram, TikTok and YouTube accounts in Zernio to see analytics here.
            </p>
          </div>
        </div>
      )}

      <HeroStrip kpis={heroKpis} />

      {/* Controls */}
      {(accounts.length > 0 || platformSnapshots.length > 0) && (
        <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm flex flex-col gap-3 lg:flex-row lg:items-center">
          <SearchInput value={search} onChange={setSearch} placeholder="Search accounts or posts…" />
          <div className="flex-1 overflow-x-auto">
            <FilterChips options={chipOptions} active={activeIds} onToggle={toggleChip} />
          </div>
        </div>
      )}

      {/* Account cards */}
      {visibleAccounts.length > 0 && (
        <section>
          <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
            Accounts
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleAccounts.map(a => (
              <AccountCard
                key={a.id}
                account={a}
                selected={selectedAcct === a.id}
                onClick={() => setSelectedAcct(s => s === a.id ? null : a.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Donut */}
      {visiblePlatforms.length > 0 && (
        <section>
          <AudienceDonut
            platforms={visiblePlatforms}
            highlightedId={highlightedId}
            onHighlight={setHl}
            onSelect={() => { /* no detail panel for social platforms */ }}
          />
        </section>
      )}

      {/* Daily Performance Chart */}
      {(snapshot?.dailyMetrics?.dailyData?.length ?? 0) >= 2 && (
        <DailyMetricsChart data={snapshot!.dailyMetrics!.dailyData} />
      )}

      {/* Platform Breakdown */}
      {(snapshot?.dailyMetrics?.platformBreakdown?.length ?? 0) > 0 && (
        <PlatformBreakdownTable rows={snapshot!.dailyMetrics!.platformBreakdown} />
      )}

      {/* Best Time + Content Decay */}
      {((snapshot?.bestTime?.slots?.length ?? 0) > 0 || (snapshot?.contentDecay?.buckets?.length ?? 0) > 0) && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {(snapshot?.bestTime?.slots?.length ?? 0) > 0 && (
            <BestTimeHeatmap slots={snapshot!.bestTime!.slots} />
          )}
          {(snapshot?.contentDecay?.buckets?.length ?? 0) > 0 && (
            <ContentDecayChart buckets={snapshot!.contentDecay!.buckets} />
          )}
        </div>
      )}

      {/* Posting Frequency */}
      {(snapshot?.postingFrequency?.frequency?.length ?? 0) > 0 && (
        <PostingFrequencyTable rows={snapshot!.postingFrequency!.frequency} />
      )}

      {/* Recent posts table */}
      {posts.length > 0 && (
        <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 px-5 pt-5">
            <p className="text-sm font-black text-slate-900">Recent Posts</p>
            <p className="text-[10px] font-bold text-slate-400">
              {visiblePosts.length} shown {selectedAcct && '· filtered by account'}
            </p>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="text-left px-5 py-2">Post</th>
                  <th className="text-left px-3 py-2 hidden sm:table-cell">Platform</th>
                  <PostSortHeader k="date"       label="Date"       sort={postSort} desc={postSortDesc} setSort={setPostSort} setDesc={setPostSortDesc} />
                  <PostSortHeader k="likes"      label="Likes"      sort={postSort} desc={postSortDesc} setSort={setPostSort} setDesc={setPostSortDesc} />
                  <PostSortHeader k="comments"   label="Comments"   sort={postSort} desc={postSortDesc} setSort={setPostSort} setDesc={setPostSortDesc} hideSm />
                  <PostSortHeader k="views"      label="Views"      sort={postSort} desc={postSortDesc} setSort={setPostSort} setDesc={setPostSortDesc} hideSm />
                  <PostSortHeader k="engagement" label="Engagement" sort={postSort} desc={postSortDesc} setSort={setPostSort} setDesc={setPostSortDesc} hideSm />
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {visiblePosts.slice(0, 50).map(p => (
                  <PostRow key={p.id} post={p} />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};

// ── Account card ──────────────────────────────────────────────────────────────

function AccountCard({
  account,
  selected,
  onClick,
}: {
  account: ZernioAccount;
  selected: boolean;
  onClick: () => void;
}) {
  const color = colorOf(account.platform);
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative w-full overflow-hidden rounded-3xl border bg-white p-5 text-left shadow-sm transition-all',
        'hover:-translate-y-0.5 hover:shadow-md',
        selected ? 'border-transparent ring-2 shadow-lg' : 'border-slate-100',
      )}
      style={selected ? { boxShadow: `0 8px 24px ${hexToRgba(color, 0.25)}` } as any : undefined}
    >
      <div className="absolute inset-x-0 top-0 h-1" style={{ background: color }} />
      {selected && (
        <div
          className="absolute inset-0 pointer-events-none rounded-3xl"
          style={{ boxShadow: `inset 0 0 0 2px ${color}` }}
        />
      )}
      <div className="flex items-start gap-3">
        {account.avatarUrl ? (
          <img src={account.avatarUrl} alt={account.username} className="h-12 w-12 rounded-2xl object-cover" />
        ) : (
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl text-base font-black text-white"
            style={{ background: color }}
          >
            {account.username.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-slate-900 truncate">@{account.username}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            {labelOf(account.platform)}
          </p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Followers</p>
          <p className="text-base font-black tabular-nums text-slate-900 mt-0.5">
            {formatNumber(account.followers)}
          </p>
        </div>
        <div>
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Posts</p>
          <p className="text-base font-black tabular-nums text-slate-900 mt-0.5">
            {formatNumber(account.posts)}
          </p>
        </div>
        <div>
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Engagement</p>
          <p className="text-base font-black tabular-nums text-slate-900 mt-0.5">
            {account.engagement != null ? `${account.engagement.toFixed(2)}%` : '—'}
          </p>
        </div>
      </div>
      <div
        className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-[10px] font-bold uppercase tracking-widest"
        style={{ color: selected ? color : undefined }}
      >
        <span className={selected ? '' : 'text-slate-400 group-hover:text-slate-600'}>
          {selected ? 'Filtering posts' : 'Click to filter posts'}
        </span>
        <ChevronDown className={cn('h-3 w-3 transition-transform text-slate-400', selected && 'rotate-180')} />
      </div>
    </button>
  );
}

// ── Sortable post table headers ───────────────────────────────────────────────

function PostSortHeader({
  k, label, sort, desc, setSort, setDesc, hideSm,
}: {
  k: PostSortKey;
  label: string;
  sort: PostSortKey;
  desc: boolean;
  setSort: (k: PostSortKey) => void;
  setDesc: (d: boolean | ((d: boolean) => boolean)) => void;
  hideSm?: boolean;
}) {
  const active = sort === k;
  return (
    <th className={cn('text-right px-3 py-2', hideSm && 'hidden md:table-cell')}>
      <button
        type="button"
        onClick={() => {
          if (active) setDesc(d => !d);
          else { setSort(k); setDesc(true); }
        }}
        className={cn(
          'inline-flex items-center gap-1 transition-colors',
          active ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600',
        )}
      >
        {label}
        {active && (desc ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />)}
      </button>
    </th>
  );
}

function PostRow({ post }: { post: ZernioPost }) {
  const color = colorOf(post.platform);
  return (
    <tr className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
      <td className="px-5 py-3 max-w-xs">
        <div className="flex items-center gap-3">
          {post.thumbnailUrl ? (
            <img src={post.thumbnailUrl} alt="" className="h-9 w-9 rounded-lg object-cover" />
          ) : (
            <div className="h-9 w-9 rounded-lg bg-slate-100" />
          )}
          <p className="text-xs font-bold text-slate-700 line-clamp-2">
            {post.caption || '(no caption)'}
          </p>
        </div>
      </td>
      <td className="px-3 py-3 hidden sm:table-cell">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-black"
          style={{ background: hexToRgba(color, 0.12), color }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
          {labelOf(post.platform)}
        </span>
      </td>
      <td className="px-3 py-3 text-right text-[11px] text-slate-500 tabular-nums">
        {timeAgo(post.publishedAt)}
      </td>
      <td className="px-3 py-3 text-right">
        <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 tabular-nums">
          <Heart className="h-3 w-3 text-rose-400" />
          {formatNumber(post.likes)}
        </span>
      </td>
      <td className="px-3 py-3 text-right hidden md:table-cell">
        <span className="inline-flex items-center gap-1 text-xs text-slate-600 tabular-nums">
          <MessageCircle className="h-3 w-3 text-slate-400" />
          {formatNumber(post.comments)}
        </span>
      </td>
      <td className="px-3 py-3 text-right hidden md:table-cell">
        <span className="inline-flex items-center gap-1 text-xs text-slate-600 tabular-nums">
          <Eye className="h-3 w-3 text-slate-400" />
          {formatNumber(post.views)}
        </span>
      </td>
      <td className="px-3 py-3 text-right hidden md:table-cell">
        <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 tabular-nums">
          <Share2 className="h-3 w-3 text-emerald-400" />
          {post.engagement != null ? `${post.engagement.toFixed(2)}%` : '—'}
        </span>
      </td>
      <td className="px-3 py-3 text-right">
        {post.postUrl && (
          <a
            href={post.postUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </td>
    </tr>
  );
}

// ── Daily Metrics Chart ───────────────────────────────────────────────────────

function DailyMetricsChart({ data }: { data: ZernioDailyMetricsDay[] }) {
  const chartData = data.map(d => ({
    date: d.date.slice(5),
    Views: d.metrics.views,
    Impressions: d.metrics.impressions,
    Likes: d.metrics.likes,
  }));
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <p className="text-sm font-black text-slate-900 mb-4">Daily Performance</p>
      <div style={{ minWidth: 0 }}>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
          <defs>
            <linearGradient id="gViews" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#FF0000" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#FF0000" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gLikes" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#E1306C" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#E1306C" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gImpr" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#1877F2" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#1877F2" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => formatNumber(v)} width={45} />
          <RechartsTooltip
            contentStyle={{ fontSize: 11, borderRadius: 12, border: '1px solid #E2E8F0' }}
            formatter={(value: any) => formatNumber(value)}
          />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10 }} />
          <Area type="monotone" dataKey="Views" stroke="#FF0000" fill="url(#gViews)" strokeWidth={2} dot={false} />
          <Area type="monotone" dataKey="Impressions" stroke="#1877F2" fill="url(#gImpr)" strokeWidth={2} dot={false} />
          <Area type="monotone" dataKey="Likes" stroke="#E1306C" fill="url(#gLikes)" strokeWidth={2} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
      </div>
    </section>
  );
}

// ── Platform Breakdown Table ──────────────────────────────────────────────────

function PlatformBreakdownTable({ rows }: { rows: ZernioPlatformBreakdown[] }) {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
      <p className="px-5 pt-5 pb-3 text-sm font-black text-slate-900">Platform Breakdown</p>
      <div className="overflow-x-auto pb-2">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-500">
            <tr>
              <th className="text-left px-5 py-2">Platform</th>
              <th className="text-right px-3 py-2">Posts</th>
              <th className="text-right px-3 py-2">Impressions</th>
              <th className="text-right px-3 py-2">Reach</th>
              <th className="text-right px-3 py-2">Likes</th>
              <th className="text-right px-3 py-2">Comments</th>
              <th className="text-right px-3 py-2 hidden md:table-cell">Views</th>
              <th className="text-right px-5 py-2 hidden md:table-cell">Saves</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const color = colorOf(row.platform);
              return (
                <tr key={row.platform} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-black"
                      style={{ background: hexToRgba(color, 0.12), color }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
                      {labelOf(row.platform)}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right font-bold tabular-nums text-slate-700">{formatNumber(row.postCount)}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-slate-600">{formatNumber(row.impressions)}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-slate-600">{formatNumber(row.reach)}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-slate-600">{formatNumber(row.likes)}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-slate-600">{formatNumber(row.comments)}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-slate-600 hidden md:table-cell">{formatNumber(row.views)}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-slate-600 hidden md:table-cell">{formatNumber(row.saves)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ── Best Time Heatmap ─────────────────────────────────────────────────────────

const DAY_LABELS_HEATMAP = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function BestTimeHeatmap({ slots }: { slots: ZernioBestTimeSlot[] }) {
  const maxEngagement = Math.max(...slots.map(s => s.avg_engagement), 0.001);
  const days  = Array.from(new Set(slots.map(s => s.day_of_week))).sort((a, b) => a - b);
  const hours = Array.from(new Set(slots.map(s => s.hour))).sort((a, b) => a - b);
  const lookup = new Map(slots.map(s => [`${s.day_of_week}-${s.hour}`, s]));

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <p className="text-sm font-black text-slate-900">Best Time to Post</p>
        <p className="text-[10px] text-slate-400 mt-0.5">Average engagement rate by day &amp; hour</p>
      </div>
      <div className="overflow-x-auto">
        <table className="text-[9px] font-bold select-none">
          <thead>
            <tr>
              <th className="w-8 pr-2" />
              {hours.map(h => (
                <th key={h} className="px-0.5 pb-1 text-center font-bold text-slate-400 w-7">
                  {h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map(day => (
              <tr key={day}>
                <td className="pr-2 text-slate-500 py-0.5">{DAY_LABELS_HEATMAP[day]}</td>
                {hours.map(hour => {
                  const slot = lookup.get(`${day}-${hour}`);
                  const intensity = slot ? slot.avg_engagement / maxEngagement : 0;
                  return (
                    <td key={hour} className="px-0.5 py-0.5">
                      <div
                        title={slot
                          ? `${DAY_LABELS_HEATMAP[day]} ${hour}:00 — ${slot.avg_engagement.toFixed(2)}% eng (${slot.post_count} posts)`
                          : 'No data'}
                        className="h-6 w-6 rounded cursor-help transition-transform hover:scale-110"
                        style={{ background: slot ? `rgba(99,102,241,${(0.08 + intensity * 0.82).toFixed(2)})` : '#F8FAFC' }}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center gap-2 text-[9px] font-bold text-slate-400">
        <span>Low</span>
        <div className="flex gap-0.5">
          {[0.1, 0.3, 0.5, 0.7, 0.9].map(v => (
            <div key={v} className="h-3 w-5 rounded" style={{ background: `rgba(99,102,241,${(0.08 + v * 0.82).toFixed(2)})` }} />
          ))}
        </div>
        <span>High</span>
      </div>
    </section>
  );
}

// ── Content Decay Chart ───────────────────────────────────────────────────────

function ContentDecayChart({ buckets }: { buckets: ZernioContentDecayBucket[] }) {
  const chartData = [...buckets]
    .sort((a, b) => a.bucket_order - b.bucket_order)
    .map(b => ({
      label: b.bucket_label,
      'Eng %': Math.round(b.avg_pct_of_final * 100),
    }));
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <p className="text-sm font-black text-slate-900">Content Decay</p>
        <p className="text-[10px] text-slate-400 mt-0.5">% of final engagement reached per time window</p>
      </div>
      <div style={{ minWidth: 0 }}>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} unit="%" domain={[0, 100]} width={32} />
          <RechartsTooltip
            contentStyle={{ fontSize: 11, borderRadius: 12, border: '1px solid #E2E8F0' }}
            formatter={(value: any) => [`${value}%`, 'Engagement']}
          />
          <Bar dataKey="Eng %" fill="#6366F1" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      </div>
    </section>
  );
}

// ── Posting Frequency Table ───────────────────────────────────────────────────

function PostingFrequencyTable({ rows }: { rows: ZernioPostingFrequencyRow[] }) {
  const sorted = [...rows].sort((a, b) => b.avg_engagement_rate - a.avg_engagement_rate);
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
      <p className="px-5 pt-5 pb-3 text-sm font-black text-slate-900">Posting Frequency vs Engagement</p>
      <div className="overflow-x-auto pb-2">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-500">
            <tr>
              <th className="text-left px-5 py-2">Platform</th>
              <th className="text-right px-3 py-2">Posts / wk</th>
              <th className="text-right px-3 py-2">Avg Engagements</th>
              <th className="text-right px-5 py-2">Eng. Rate</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(row => {
              const color = colorOf(row.platform);
              return (
                <tr key={row.platform} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-black"
                      style={{ background: hexToRgba(color, 0.12), color }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
                      {labelOf(row.platform)}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right font-bold tabular-nums text-slate-700">
                    {row.posts_per_week.toFixed(1)}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-slate-600">
                    {formatNumber(Math.round(row.avg_engagement))}
                  </td>
                  <td className="px-5 py-3 text-right font-black tabular-nums" style={{ color }}>
                    {row.avg_engagement_rate.toFixed(2)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
