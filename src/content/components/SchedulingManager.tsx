import React from 'react';
import {
  Clock,
  Filter,
  Calendar as CalendarIcon,
  Search,
  Instagram,
  Smartphone,
  Youtube,
  Twitter,
  Send,
  XCircle,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  MoreVertical,
  ChevronRight,
  RefreshCw,
  Video,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { ContentItem, Platform, PublishStatus } from '../types';
import { Release } from '../../types';
import { motion, AnimatePresence } from 'motion/react';

interface SchedulingManagerProps {
  items: ContentItem[];
  releases: Release[];
  onEdit: (item: ContentItem) => void;
  onPublishNow: (item: ContentItem) => Promise<void>;
  onCancel: (item: ContentItem) => Promise<void>;
  onReschedule: (item: ContentItem) => void;
}

const platformIcons: Record<string, any> = {
  Instagram,
  TikTok: Smartphone,
  YouTube: Youtube,
  Twitter,
};

const statusConfig: Record<PublishStatus, { label: string; color: string; bg: string; border: string; icon: any }> = {
  draft: { label: 'Draft', color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200', icon: Edit2 },
  scheduled: { label: 'Scheduled', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', icon: Clock },
  published: { label: 'Published', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: CheckCircle2 },
  failed: { label: 'Failed', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', icon: AlertCircle },
  cancelled: { label: 'Cancelled', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', icon: XCircle },
};

export function SchedulingManager({ items, releases, onEdit, onPublishNow, onCancel, onReschedule }: SchedulingManagerProps) {
  const [platformFilter, setPlatformFilter] = React.useState<Platform | 'all'>('all');
  const [statusFilter, setStatusFilter] = React.useState<PublishStatus | 'all'>('all');
  const [dateFilter, setDateFilter] = React.useState<'all' | 'today' | 'week' | 'month'>('all');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);

  const schedulingItems = items;

  const filteredItems = schedulingItems.filter((item) => {
    if (platformFilter !== 'all' && item.platform !== platformFilter) return false;

    const ps = item.publish_status || 'draft';
    if (statusFilter !== 'all' && ps !== statusFilter) return false;

    if (dateFilter !== 'all' && item.scheduled_at) {
      const itemDate = new Date(item.scheduled_at);
      const now = new Date();
      if (dateFilter === 'today') {
        if (itemDate.toDateString() !== now.toDateString()) return false;
      } else if (dateFilter === 'week') {
        const weekFromNow = new Date(now);
        weekFromNow.setDate(now.getDate() + 7);
        if (itemDate > weekFromNow || itemDate < now) return false;
      } else if (dateFilter === 'month') {
        const monthFromNow = new Date(now);
        monthFromNow.setMonth(now.getMonth() + 1);
        if (itemDate > monthFromNow || itemDate < now) return false;
      }
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (
        !item.title?.toLowerCase().includes(q) &&
        !item.caption?.toLowerCase().includes(q) &&
        !item.hook?.toLowerCase().includes(q)
      ) return false;
    }

    return true;
  });

  const sortedItems = [...filteredItems].sort((a, b) => {
    const dateA = a.scheduled_at ? new Date(a.scheduled_at).getTime() : 0;
    const dateB = b.scheduled_at ? new Date(b.scheduled_at).getTime() : 0;
    return dateB - dateA;
  });

  const stats = {
    total: schedulingItems.length,
    scheduled: schedulingItems.filter((i) => i.publish_status === 'scheduled').length,
    published: schedulingItems.filter((i) => i.publish_status === 'published' || i.status === 'posted').length,
    failed: schedulingItems.filter((i) => i.publish_status === 'failed').length,
    draft: schedulingItems.filter((i) => !i.publish_status || i.publish_status === 'draft').length,
  };

  const handleQuickPublish = async (item: ContentItem) => {
    setActionLoading(item.id);
    try {
      await onPublishNow(item);
    } finally {
      setActionLoading(null);
    }
  };

  const handleQuickCancel = async (item: ContentItem) => {
    setActionLoading(item.id);
    try {
      await onCancel(item);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
          <CalendarIcon className="w-6 h-6 text-blue-600" />
        </div>
        <div className="space-y-1">
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">Scheduling Manager</h3>
          <p className="text-slate-500 font-medium text-sm">Manage all your scheduled and draft posts.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Drafts', value: stats.draft, color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200' },
          { label: 'Scheduled', value: stats.scheduled, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
          { label: 'Published', value: stats.published, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
          { label: 'Failed', value: stats.failed, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
        ].map((stat) => (
          <div key={stat.label} className={cn("p-4 rounded-2xl border", stat.bg, stat.border)}>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{stat.label}</p>
            <p className={cn("text-2xl font-black", stat.color)}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search posts..."
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value as Platform | 'all')}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 focus:outline-none"
          >
            <option value="all">All Platforms</option>
            <option value="Instagram">Instagram</option>
            <option value="TikTok">TikTok</option>
            <option value="YouTube">YouTube</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as PublishStatus | 'all')}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 focus:outline-none"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="published">Published</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as 'all' | 'today' | 'week' | 'month')}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 focus:outline-none"
          >
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>
      </div>

      <div className="space-y-3">
        <AnimatePresence>
          {sortedItems.length === 0 ? (
            <div className="text-center py-16 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
              <Video className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-bold">No posts match your filters</p>
              <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or create a new post.</p>
            </div>
          ) : (
            sortedItems.map((item) => {
              const ps = item.publish_status || 'draft';
              const config = statusConfig[ps];
              const PIcon = platformIcons[item.platform] || Video;
              const SIcon = config.icon;
              const release = releases.find((r) => r.id === item.track_id);
              const isLoading = actionLoading === item.id;

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={cn(
                    "glass-card p-5 hover:shadow-lg transition-all cursor-pointer group",
                    config.bg, config.border
                  )}
                  onClick={() => onEdit(item)}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn("p-3 rounded-2xl border shadow-sm", config.bg, config.border)}>
                      <PIcon className={cn("w-5 h-5", config.color)} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-black text-slate-900 truncate">{item.title || item.hook || 'Untitled'}</p>
                        <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0", config.bg, config.color, config.border, "border")}>
                          <SIcon className="w-2.5 h-2.5 inline mr-1" />
                          {config.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <span>{item.platform}</span>
                        {item.scheduled_at && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <CalendarIcon className="w-2.5 h-2.5" />
                              {new Date(item.scheduled_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                              {' '}
                              {new Date(item.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </>
                        )}
                        {release && (
                          <>
                            <span>•</span>
                            <span className="text-blue-500">{release.title}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                      ) : (
                        <>
                          {(ps === 'draft' || ps === 'scheduled') && (
                            <button
                              onClick={() => handleQuickPublish(item)}
                              className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors border border-emerald-200"
                              title="Publish Now"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {ps === 'scheduled' && (
                            <button
                              onClick={() => handleQuickCancel(item)}
                              className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors border border-red-200"
                              title="Cancel"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {(ps === 'failed' || ps === 'cancelled') && (
                            <button
                              onClick={() => onReschedule(item)}
                              className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors border border-blue-200"
                              title="Reschedule"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => onEdit(item)}
                            className="p-2 bg-white text-slate-500 rounded-xl hover:bg-slate-100 transition-colors border border-slate-200"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
