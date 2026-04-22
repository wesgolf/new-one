/**
 * SinceLastLogin — What changed since the user was last here.
 * Shows stat chips + a filterable activity list.
 */

import React, { useState } from 'react';
import { Lightbulb, CheckSquare, Calendar, Music, FileText, Clock } from 'lucide-react';
import { cn } from '../../lib/utils';
import { DashCard, DashSkeleton } from './DashCard';
import type { SinceLastLoginDelta, SinceLastLoginItem } from '../../hooks/useDashboard';

// ─── Helpers ─────────────────────────────────────────────────────────────────

type FilterType = 'all' | SinceLastLoginItem['type'];

const TYPE_CONFIG: Record<SinceLastLoginItem['type'], { label: string; Icon: React.ElementType; color: string }> = {
  idea:    { label: 'Ideas',    Icon: Lightbulb,    color: 'text-yellow-500' },
  task:    { label: 'Tasks',    Icon: CheckSquare,  color: 'text-blue-500'   },
  event:   { label: 'Events',   Icon: Calendar,     color: 'text-emerald-500'},
  release: { label: 'Releases', Icon: Music,        color: 'text-blue-500' },
  content: { label: 'Content',  Icon: FileText,     color: 'text-rose-500'   },
};

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

// ─── Chip ────────────────────────────────────────────────────────────────────

interface ChipProps {
  type: SinceLastLoginItem['type'];
  count: number;
  active: boolean;
  onClick: () => void;
}

function StatChip({ type, count, active, onClick }: ChipProps) {
  const { label, Icon, color } = TYPE_CONFIG[type];
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
        active
          ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
          : 'bg-white text-text-secondary border-border hover:border-[var(--color-primary)] hover:text-text-primary'
      )}
    >
      <Icon className={cn('w-3.5 h-3.5', active ? 'text-white' : color)} />
      <span>{count} {label}</span>
    </button>
  );
}

// ─── Activity Row ─────────────────────────────────────────────────────────────

function ActivityRow({ item }: { item: SinceLastLoginItem }) {
  const { Icon, color } = TYPE_CONFIG[item.type];
  return (
    <li className="flex items-start gap-3 py-2.5 border-b border-border last:border-0">
      <div className={cn('mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center bg-slate-50 shrink-0', color)}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text-primary truncate font-medium">{item.title}</p>
        {item.detail && <p className="text-xs text-text-tertiary capitalize">{item.detail}</p>}
      </div>
      <span className="text-xs text-text-tertiary whitespace-nowrap shrink-0">{relativeTime(item.at)}</span>
    </li>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

interface SinceLastLoginProps {
  delta: SinceLastLoginDelta;
  loading?: boolean;
}

export function SinceLastLogin({ delta, loading }: SinceLastLoginProps) {
  const [filter, setFilter] = useState<FilterType>('all');

  const hasAnything =
    delta.newIdeas + delta.newTasks + delta.newEvents + delta.releaseChanges + delta.newContent > 0;

  const filtered = filter === 'all' ? delta.items : delta.items.filter(i => i.type === filter);

  const toggleFilter = (t: SinceLastLoginItem['type']) =>
    setFilter(prev => (prev === t ? 'all' : t));

  const title = (
    <span className="flex items-center gap-2">
      <Clock className="w-4 h-4 text-text-tertiary" />
      Since you were last here
      {delta.lastLoginAt && (
        <span className="font-normal text-text-tertiary normal-case tracking-normal">
          · {relativeTime(delta.lastLoginAt.toISOString())}
        </span>
      )}
    </span>
  );

  return (
    <DashCard title={title}>
      {loading ? (
        <DashSkeleton rows={4} />
      ) : !hasAnything ? (
        <p className="text-sm text-text-tertiary py-3">Nothing new since your last visit.</p>
      ) : (
        <>
          {/* Stat chips */}
          <div className="flex flex-wrap gap-2 mb-4">
            {delta.newIdeas    > 0 && <StatChip type="idea"    count={delta.newIdeas}      active={filter === 'idea'}    onClick={() => toggleFilter('idea')}    />}
            {delta.newTasks    > 0 && <StatChip type="task"    count={delta.newTasks}      active={filter === 'task'}    onClick={() => toggleFilter('task')}    />}
            {delta.newEvents   > 0 && <StatChip type="event"   count={delta.newEvents}     active={filter === 'event'}   onClick={() => toggleFilter('event')}   />}
            {delta.releaseChanges > 0 && <StatChip type="release" count={delta.releaseChanges} active={filter === 'release'} onClick={() => toggleFilter('release')} />}
            {delta.newContent  > 0 && <StatChip type="content" count={delta.newContent}    active={filter === 'content'} onClick={() => toggleFilter('content')} />}
          </div>

          {/* Activity list */}
          {filtered.length === 0 ? (
            <p className="text-xs text-text-tertiary py-2">No items match this filter.</p>
          ) : (
            <ul>
              {filtered.map((item, idx) => (
                <ActivityRow key={`${item.type}-${idx}`} item={item} />
              ))}
            </ul>
          )}
        </>
      )}
    </DashCard>
  );
}
