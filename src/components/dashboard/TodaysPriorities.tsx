/**
 * TodaysPriorities — Actionable items for the current day.
 * Tasks due, scheduled posts, failed posts, release deadlines.
 */

import React from 'react';
import {
  CheckSquare, Send, AlertTriangle, Music, Calendar,
  Flame, ChevronRight
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { DashCard, DashSkeleton } from './DashCard';
import type { TodayItem } from '../../hooks/useDashboard';

// ─── Config ───────────────────────────────────────────────────────────────────

const TYPE_CONFIG = {
  task:     { Icon: CheckSquare,   label: 'Task',      bg: 'bg-blue-50',    iconColor: 'text-blue-500'    },
  post:     { Icon: Send,          label: 'Post',      bg: 'bg-emerald-50', iconColor: 'text-emerald-500' },
  error:    { Icon: AlertTriangle, label: 'Failed',    bg: 'bg-red-50',     iconColor: 'text-red-500'     },
  deadline: { Icon: Flame,         label: 'Deadline',  bg: 'bg-orange-50',  iconColor: 'text-orange-500'  },
  release:  { Icon: Music,         label: 'Release',   bg: 'bg-purple-50',  iconColor: 'text-purple-500'  },
} as const;

const PRIORITY_CONFIG = {
  high:   { dot: 'bg-red-500',    label: 'High'   },
  medium: { dot: 'bg-yellow-400', label: 'Medium' },
  low:    { dot: 'bg-green-400',  label: 'Low'    },
} as const;

function formatTime(isoStr?: string): string {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ─── Row ─────────────────────────────────────────────────────────────────────

function PriorityRow({ item }: { item: TodayItem }) {
  const { Icon, bg, iconColor } = TYPE_CONFIG[item.type];
  const { dot } = PRIORITY_CONFIG[item.priority];
  const time = formatTime(item.at);

  return (
    <li className="flex items-center gap-3 py-2.5 border-b border-border last:border-0 group">
      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', bg)}>
        <Icon className={cn('w-4 h-4', iconColor)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">{item.title}</p>
        {item.detail && (
          <p className="text-xs text-text-tertiary capitalize">{item.detail}</p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {time && <span className="text-xs text-text-tertiary">{time}</span>}
        <span className={cn('w-2 h-2 rounded-full', dot)} title={PRIORITY_CONFIG[item.priority].label} />
        <ChevronRight className="w-3.5 h-3.5 text-border opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </li>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

interface TodaysPrioritiesProps {
  items: TodayItem[];
  loading?: boolean;
}

export function TodaysPriorities({ items, loading }: TodaysPrioritiesProps) {
  const high   = items.filter(i => i.priority === 'high');
  const others = items.filter(i => i.priority !== 'high');

  const headerAction = items.length > 0 && (
    <span className="text-xs font-semibold text-text-tertiary">
      {items.length} item{items.length !== 1 ? 's' : ''}
    </span>
  );

  return (
    <DashCard title="Today's Priorities" action={headerAction}>
      {loading ? (
        <DashSkeleton rows={4} />
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
          <Calendar className="w-8 h-8 text-border" />
          <p className="text-sm text-text-tertiary">All clear — nothing due today.</p>
        </div>
      ) : (
        <ul>
          {/* High-priority items first */}
          {high.length > 0 && (
            <>
              <li className="pb-1 pt-0.5">
                <span className="text-[10px] font-bold tracking-widest uppercase text-red-500">
                  Urgent
                </span>
              </li>
              {high.map(item => <PriorityRow key={item.id} item={item} />)}
            </>
          )}

          {/* Medium + Low items */}
          {others.length > 0 && (
            <>
              {high.length > 0 && (
                <li className="pb-1 pt-2">
                  <span className="text-[10px] font-bold tracking-widest uppercase text-text-tertiary">
                    Other
                  </span>
                </li>
              )}
              {others.map(item => <PriorityRow key={item.id} item={item} />)}
            </>
          )}
        </ul>
      )}
    </DashCard>
  );
}
