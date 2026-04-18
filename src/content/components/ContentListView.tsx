import React, { useState, useEffect } from 'react';
import { Film, Instagram, Music2, Youtube, Search, Filter, Clock, CheckCircle2, XCircle, AlertCircle, MoreVertical, Loader2, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { ContentItemWithAssets, PlatformPost, PlatformPostStatus } from '../types';
import { contentService } from '../../services/contentService';

interface ContentListViewProps {
  onEditItem: (item: ContentItemWithAssets) => void;
  refreshTrigger?: number;
}

const platformIcons: Record<string, React.ElementType> = {
  Instagram: Instagram,
  TikTok: Music2,
  YouTube: Youtube,
};

const statusColors: Record<PlatformPostStatus, { bg: string; text: string; dot: string }> = {
  draft: { bg: 'bg-slate-50', text: 'text-slate-600', dot: 'bg-slate-400' },
  scheduled: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  publishing: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  published: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  failed: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  cancelled: { bg: 'bg-slate-50', text: 'text-slate-500', dot: 'bg-slate-300' },
};

export function ContentListView({ onEditItem, refreshTrigger }: ContentListViewProps) {
  const [items, setItems] = useState<ContentItemWithAssets[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadItems();
  }, [refreshTrigger]);

  const loadItems = async () => {
    setLoading(true);
    try {
      const data = await contentService.getContentItemsWithPosts();
      setItems(data);
    } catch (err) {
      console.error('Failed to load content:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter(item => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!item.title?.toLowerCase().includes(q) && !item.campaign?.toLowerCase().includes(q)) {
        return false;
      }
    }
    if (platformFilter !== 'all') {
      const hasPlatform = item.platform_posts?.some(p => p.platform === platformFilter) || item.platform === platformFilter;
      if (!hasPlatform) return false;
    }
    if (statusFilter !== 'all') {
      if (item.publish_status !== statusFilter) {
        const hasStatus = item.platform_posts?.some(p => p.status === statusFilter);
        if (!hasStatus) return false;
      }
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search content..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          />
        </div>
        <select
          value={platformFilter}
          onChange={(e) => setPlatformFilter(e.target.value)}
          className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none min-w-[140px]"
        >
          <option value="all">All Platforms</option>
          <option value="Instagram">Instagram</option>
          <option value="TikTok">TikTok</option>
          <option value="YouTube">YouTube</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none min-w-[140px]"
        >
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="scheduled">Scheduled</option>
          <option value="published">Published</option>
          <option value="failed">Failed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-16">
          <Film className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-sm font-medium text-slate-400">No content found</p>
          <p className="text-xs text-slate-300 mt-1">Upload a video to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map(item => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-4 hover:shadow-lg transition-all cursor-pointer group"
              onClick={() => onEditItem(item)}
            >
              <div className="flex items-start gap-4">
                {item.media_url || item.assets?.[0]?.file_url ? (
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-black flex-shrink-0">
                    <video
                      src={item.media_url || item.assets?.[0]?.file_url}
                      className="w-full h-full object-cover"
                      muted
                      preload="metadata"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <Film className="w-6 h-6 text-slate-300" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-black text-slate-900 truncate">{item.title || 'Untitled'}</h4>
                      {item.campaign && (
                        <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">{item.campaign}</span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap">
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {item.platform_posts && item.platform_posts.length > 0 ? (
                      item.platform_posts.map(post => {
                        const Icon = platformIcons[post.platform] || Film;
                        const colors = statusColors[post.status] || statusColors.draft;
                        return (
                          <div
                            key={post.id}
                            className={cn(
                              "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                              colors.bg, colors.text
                            )}
                          >
                            <div className={cn("w-1.5 h-1.5 rounded-full", colors.dot)} />
                            <Icon className="w-3 h-3" />
                            <span>{post.status}</span>
                            {post.scheduled_at && (
                              <span className="flex items-center gap-0.5 ml-1 opacity-75">
                                <Clock className="w-2.5 h-2.5" />
                                {new Date(post.scheduled_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                        {item.publish_status || 'draft'}
                      </div>
                    )}
                  </div>
                </div>

                <button className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-600 transition-all">
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
