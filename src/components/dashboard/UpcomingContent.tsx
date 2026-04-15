/**
 * UpcomingContent — Next scheduled posts and events at a glance.
 * Platform icon, title, relative time, status badge.
 */

import React from 'react';
import { Send, Music, Mic, Video, Image, FileText, Calendar, Ratio } from 'lucide-react';
import { cn } from '../../lib/utils';
import { DashCard, DashSkeleton } from './DashCard';
import type { UpcomingItem } from '../../hooks/useDashboard';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PLATFORM_ICONS: Record<string, React.ElementType> = {
  instagram:  Image,
  tiktok:     Ratio,
  youtube:    Video,
  spotify:    Music,
  soundcloud: Music,
  twitter:    Send,
  x:          Send,
  podcast:    Mic,
  show:       Calendar,
};

function getPlatformIcon(platform?: string): React.ElementType {
  if (!platform) return FileText;
  return PLATFORM_ICONS[platform.toLowerCase()] ?? FileText;
}

const PLATFORM_COLORS: Record<string, string> = {
  instagram:  'bg-pink-50 text-pink-600',
  tiktok:     'bg-slate-800 text-white',
  youtube:    'bg-red-50 text-red-600',
  spotify:    'bg-emerald-50 text-emerald-600',
  soundcloud: 'bg-orange-50 text-orange-600',
  twitter:    'bg-sky-50 text-sky-600',
  x:          'bg-sky-50 text-sky-600',
  podcast:    'bg-purple-50 text-purple-600',
  show:       'bg-indigo-50 text-indigo-600',
};

function getPlatformColor(platform?: string): string {
  if (!platform) return 'bg-slate-50 text-slate-500';
  return PLATFORM_COLORS[platform.toLowerCase()] ?? 'bg-slate-50 text-slate-500';
}

const STATUS_BADGE: Record<string, string> = {
  scheduled: 'bg-blue-50   text-blue-600   border-blue-100',
  ready:     'bg-emerald-50 text-emerald-600 border-emerald-100',
  draft:     'bg-slate-50  text-slate-500  border-slate-100',
  upcoming:  'bg-indigo-50 text-indigo-600 border-indigo-100',
  failed:    'bg-red-50    text-red-600    border-red-100',
};

function relativeDateTime(isoStr: string): string {
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffMins  = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays  = Math.floor(diffMs / 86_400_000);

  if (diffMins < 60)  return `in ${diffMins}m`;
  if (diffHours < 24) return `in ${diffHours}h`;
  if (diffDays === 1) return 'tomorrow';
  if (diffDays < 7)   return `in ${diffDays}d`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// ─── Row ─────────────────────────────────────────────────────────────────────

function ContentRow({ item }: { item: UpcomingItem }) {
  const Icon = getPlatformIcon(item.platform);
  const iconClass = getPlatformColor(item.platform);
  const statusClass = STATUS_BADGE[item.status] ?? STATUS_BADGE.draft;

  return (
    <li className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', iconClass)}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">{item.title}</p>
        <p className="text-xs text-text-tertiary capitalize">
          {item.platform ?? item.type}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-text-secondary">{relativeDateTime(item.scheduledAt)}</span>
        <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize', statusClass)}>
          {item.status}
        </span>
      </div>
    </li>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

interface UpcomingContentProps {
  items: UpcomingItem[];
  loading?: boolean;
}

export function UpcomingContent({ items, loading }: UpcomingContentProps) {
  const headerAction = items.length > 0 && (
    <span className="text-xs text-text-tertiary">{items.length} upcoming</span>
  );

  return (
    <DashCard title="Upcoming Content" action={headerAction}>
      {loading ? (
        <DashSkeleton rows={5} />
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
          <Send className="w-8 h-8 text-border" />
          <p className="text-sm text-text-tertiary">No posts scheduled yet.</p>
        </div>
      ) : (
        <ul>
          {items.map(item => <ContentRow key={item.id} item={item} />)}
        </ul>
      )}
    </DashCard>
  );
}
