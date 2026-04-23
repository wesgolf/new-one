/**
 * Intelligence — What actually matters since you were last here.
 *
 * Layout:
 *   1. Synthesized insight cards (achievement / milestone / trend / alert)
 *   2. Calendar mini-strip (today's priorities + upcoming)
 *   3. 5 most recent activity items
 */

import React from 'react';
import { Trophy, Music2, TrendingUp, AlertTriangle, Zap, CalendarDays } from 'lucide-react';
import { cn } from '../../lib/utils';
import { DashCard, DashSkeleton } from './DashCard';
import type { SinceLastLoginDelta, SinceLastLoginItem, InsightItem, TodayItem, UpcomingItem } from '../../hooks/useDashboard';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(isoStr: string): string {
  if (!isoStr) return '';
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins < 2)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function shortDate(isoStr: string): string {
  return new Date(isoStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function shortTime(isoStr: string): string {
  if (isoStr.length <= 10) return '';
  return new Date(isoStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

// ─── Insight Card ─────────────────────────────────────────────────────────────

const INSIGHT_CONFIG: Record<InsightItem['type'], {
  Icon: React.ElementType;
  borderColor: string;
  bgColor: string;
  iconColor: string;
}> = {
  achievement: {
    Icon: Trophy,
    borderColor: 'border-l-emerald-400',
    bgColor: 'bg-emerald-50/70',
    iconColor: 'text-emerald-500',
  },
  milestone: {
    Icon: Music2,
    borderColor: 'border-l-[var(--color-primary)]',
    bgColor: 'bg-violet-50/50',
    iconColor: 'text-[var(--color-primary)]',
  },
  trend: {
    Icon: TrendingUp,
    borderColor: 'border-l-blue-400',
    bgColor: 'bg-blue-50/60',
    iconColor: 'text-blue-500',
  },
  alert: {
    Icon: AlertTriangle,
    borderColor: 'border-l-amber-400',
    bgColor: 'bg-amber-50/70',
    iconColor: 'text-amber-500',
  },
};

function InsightCard({ item }: { item: InsightItem }) {
  const { Icon, borderColor, bgColor, iconColor } = INSIGHT_CONFIG[item.type];
  return (
    <div className={cn('flex items-start gap-3 px-3 py-2.5 rounded-xl border-l-4', borderColor, bgColor)}>
      <div className={cn('mt-0.5 shrink-0', iconColor)}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary leading-snug">{item.headline}</p>
        {item.detail && <p className="text-xs text-text-tertiary mt-0.5">{item.detail}</p>}
      </div>
      {item.at && (
        <span className="text-[10px] text-text-tertiary shrink-0 pt-0.5">{relativeTime(item.at)}</span>
      )}
    </div>
  );
}

// ─── Calendar Strip ───────────────────────────────────────────────────────────

interface CalendarStripProps {
  todayItems: TodayItem[];
  upcomingItems: UpcomingItem[];
}

function CalendarStrip({ todayItems, upcomingItems }: CalendarStripProps) {
  const now = new Date();
  const todayLabel = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const todayHighlights = todayItems.slice(0, 2);
  const nextUp = upcomingItems
    .filter(u => u.scheduledAt > now.toISOString())
    .slice(0, 3);

  return (
    <div className="rounded-xl border border-border/60 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-50/80 border-b border-border/40">
        <CalendarDays className="w-3.5 h-3.5 text-text-tertiary" />
        <span className="text-[10px] font-bold text-text-muted uppercase tracking-[0.14em]">Today</span>
        <span className="text-xs text-text-tertiary ml-auto">{todayLabel}</span>
      </div>
      {todayHighlights.length === 0 && nextUp.length === 0 ? (
        <p className="text-xs text-text-tertiary px-3 py-2.5">Clear schedule today.</p>
      ) : (
        <div className="divide-y divide-border/30">
          {todayHighlights.map(item => (
            <div key={item.id} className="flex items-center gap-2.5 px-3 py-2">
              <div className={cn(
                'w-1.5 h-1.5 rounded-full shrink-0',
                item.priority === 'high' ? 'bg-red-400' :
                item.priority === 'medium' ? 'bg-amber-400' : 'bg-slate-300'
              )} />
              <span className="text-xs text-text-primary truncate flex-1">{item.title}</span>
              {item.at && (
                <span className="text-[10px] text-text-tertiary shrink-0">
                  {shortTime(item.at) || item.at}
                </span>
              )}
            </div>
          ))}
          {nextUp.map(item => (
            <div key={item.id} className="flex items-center gap-2.5 px-3 py-2 opacity-65">
              <div className="w-1.5 h-1.5 rounded-full shrink-0 bg-slate-300" />
              <span className="text-xs text-text-secondary truncate flex-1">{item.title}</span>
              <span className="text-[10px] text-text-tertiary shrink-0">{shortDate(item.scheduledAt)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Activity Row ─────────────────────────────────────────────────────────────

const ITEM_DOT: Record<SinceLastLoginItem['type'], string> = {
  idea:    'bg-yellow-400',
  task:    'bg-blue-400',
  event:   'bg-emerald-400',
  release: 'bg-violet-400',
  content: 'bg-rose-400',
};

function ActivityRow({ item }: { item: SinceLastLoginItem }) {
  return (
    <li className="flex items-center gap-2.5 py-2 border-b border-border/30 last:border-0">
      <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', ITEM_DOT[item.type])} />
      <p className="text-xs text-text-primary truncate flex-1">{item.title}</p>
      {item.detail && (
        <span className="text-[10px] text-text-tertiary capitalize shrink-0">{item.detail}</span>
      )}
      <span className="text-[10px] text-text-tertiary whitespace-nowrap shrink-0 ml-1">
        {relativeTime(item.at)}
      </span>
    </li>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export interface SinceLastLoginProps {
  delta: SinceLastLoginDelta;
  todayItems?: TodayItem[];
  upcomingItems?: UpcomingItem[];
  loading?: boolean;
}

export function SinceLastLogin({ delta, todayItems = [], upcomingItems = [], loading }: SinceLastLoginProps) {
  const recentActivity = delta.items.slice(0, 5);

  const cardTitle = (
    <span className="flex items-center gap-2">
      <Zap className="w-3.5 h-3.5 text-[var(--color-primary)]" />
      Intelligence
      {delta.lastLoginAt && (
        <span className="font-normal text-text-tertiary normal-case tracking-normal">
          · {relativeTime(delta.lastLoginAt.toISOString())}
        </span>
      )}
    </span>
  );

  if (loading) {
    return <DashCard title={cardTitle}><DashSkeleton rows={4} /></DashCard>;
  }

  return (
    <DashCard title={cardTitle}>
      <div className="space-y-4">

        {/* ── Insights ─────────────────────────────────────────────────── */}
        {delta.insights.length > 0 ? (
          <div className="space-y-2">
            {delta.insights.map(insight => (
              <InsightCard key={insight.id} item={insight} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-tertiary py-1">All quiet since your last visit.</p>
        )}

        {/* ── Calendar ─────────────────────────────────────────────────── */}
        <CalendarStrip todayItems={todayItems} upcomingItems={upcomingItems} />

        {/* ── Recent Activity ───────────────────────────────────────────── */}
        {recentActivity.length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.14em] mb-2">
              Recent Activity
            </p>
            <ul>
              {recentActivity.map((item, idx) => (
                <ActivityRow key={`${item.type}-${idx}`} item={item} />
              ))}
            </ul>
          </div>
        )}

      </div>
    </DashCard>
  );
}
