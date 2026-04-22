import React from 'react';
import { 
  Music, 
  TrendingUp, 
  Eye, 
  Zap, 
  Smartphone, 
  Youtube, 
  Instagram, 
  Twitter,
  ChevronRight,
  Target,
  BarChart3,
  Share2
} from 'lucide-react';
import { ContentItem, ContentAnalytics, Platform } from '../types';
import { Release } from '../../types';
import { cn } from '../../lib/utils';
import { motion } from 'motion/react';

interface TrackContentImpactPanelProps {
  releases: Release[];
  items: ContentItem[];
  analytics: ContentAnalytics[];
}

const platformIcons = {
  Instagram: Instagram,
  TikTok: Smartphone,
  YouTube: Youtube,
  Twitter: Twitter,
};

export const TrackContentImpactPanel: React.FC<TrackContentImpactPanelProps> = ({
  releases,
  items,
  analytics
}) => {
  return (
    <section className="glass-card p-8 lg:p-10 space-y-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
            <Music className="w-6 h-6 text-blue-600" />
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Content Impact by Track</h3>
            <p className="text-slate-500 font-medium text-sm">How your social push is driving track awareness.</p>
          </div>
        </div>
        <button className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-700 flex items-center gap-2">
          Full Report
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {releases.map((release, i) => {
          const trackPosts = items.filter(item => item.track_id === release.id);
          const trackAnalytics = analytics.filter(ana => 
            trackPosts.some(post => post.id === ana.content_item_id)
          );
          
          const totalViews = trackAnalytics.reduce((acc, a) => acc + a.views, 0);
          const totalEngagement = trackAnalytics.reduce((acc, a) => acc + a.engagement_rate, 0) / (trackAnalytics.length || 1);
          const bestPost = trackPosts.sort((a, b) => {
            const anaA = analytics.find(ana => ana.content_item_id === a.id)?.views || 0;
            const anaB = analytics.find(ana => ana.content_item_id === b.id)?.views || 0;
            return anaB - anaA;
          })[0];

          const platformCounts: Record<string, number> = {};
          trackPosts.forEach(p => {
            platformCounts[p.platform] = (platformCounts[p.platform] || 0) + 1;
          });
          const topPlatform = Object.entries(platformCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as Platform;

          return (
            <motion.div 
              key={release.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex flex-col lg:flex-row items-center justify-between p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100 hover:border-blue-200 hover:bg-white hover:shadow-xl transition-all group"
            >
              <div className="flex items-center gap-6 w-full lg:w-1/3">
                <div className="w-16 h-16 bg-white rounded-2xl border border-slate-200 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                  <Music className="w-8 h-8 text-slate-400" />
                </div>
                <div className="space-y-1">
                  <p className="text-lg font-black text-slate-900 leading-tight">{release.title}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{trackPosts.length} Posts</span>
                    <span className="w-1 h-1 bg-slate-300 rounded-full" />
                    <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{release.status}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between lg:justify-end gap-x-12 gap-y-6 w-full lg:w-2/3 mt-8 lg:mt-0 pt-8 lg:pt-0 border-t lg:border-t-0 border-slate-200">
                <div className="text-center lg:text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Views</p>
                  <div className="flex items-center justify-center lg:justify-end gap-2">
                    <Eye className="w-4 h-4 text-blue-500" />
                    <p className="text-xl font-black text-slate-900">{(totalViews / 1000).toFixed(1)}k</p>
                  </div>
                </div>

                <div className="text-center lg:text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Avg Engagement</p>
                  <div className="flex items-center justify-center lg:justify-end gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <p className="text-xl font-black text-slate-900">{totalEngagement.toFixed(1)}%</p>
                  </div>
                </div>

                <div className="text-center lg:text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Top Platform</p>
                  <div className="flex items-center justify-center lg:justify-end gap-2">
                    {topPlatform && React.createElement(platformIcons[topPlatform] || Share2, { className: "w-4 h-4 text-slate-400" })}
                    <p className="text-xl font-black text-slate-900">{topPlatform || '-'}</p>
                  </div>
                </div>

                <div className="hidden xl:block text-right min-w-[140px]">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Best Post</p>
                  <p className="text-sm font-black text-slate-900 line-clamp-1 italic">
                    {bestPost ? `"${bestPost.hook}"` : 'No posts yet'}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};
