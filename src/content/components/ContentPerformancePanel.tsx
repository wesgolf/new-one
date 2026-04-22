import React from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Eye, 
  Heart, 
  MessageCircle, 
  Bookmark, 
  Share2, 
  Zap, 
  Filter, 
  ChevronRight,
  Music,
  Smartphone,
  Youtube,
  Instagram,
  Twitter,
  Play
} from 'lucide-react';
import { ContentItem, ContentAnalytics, Platform } from '../types';
import { Release } from '../../types';
import { cn } from '../../lib/utils';
import { motion } from 'motion/react';

interface ContentPerformancePanelProps {
  items: ContentItem[];
  analytics: ContentAnalytics[];
  releases: Release[];
}

const platformIcons = {
  Instagram: Instagram,
  TikTok: Smartphone,
  YouTube: Youtube,
  Twitter: Twitter,
};

export const ContentPerformancePanel: React.FC<ContentPerformancePanelProps> = ({
  items,
  analytics,
  releases
}) => {
  const postedItems = items.filter(i => i.status === 'posted');
  const [selectedPlatform, setSelectedPlatform] = React.useState<Platform | 'all'>('all');

  const filteredItems = selectedPlatform === 'all' 
    ? postedItems 
    : postedItems.filter(i => i.platform === selectedPlatform);

  const getAnalytics = (id: string) => analytics.find(a => a.content_item_id === id);

  return (
    <section className="glass-card p-8 lg:p-10 space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-blue-600" />
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Performance Analytics</h3>
            <p className="text-slate-500 font-medium text-sm">Real-time feedback from Zernio ingestion.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {(['all', 'Instagram', 'TikTok', 'YouTube'] as const).map(p => (
            <button
              key={p}
              onClick={() => setSelectedPlatform(p)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all border-2",
                selectedPlatform === p 
                  ? "bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-900/20" 
                  : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Views', value: analytics.reduce((acc, a) => acc + a.views, 0), icon: Eye, color: 'text-blue-500', bg: 'bg-blue-50' },
          { label: 'Avg Engagement', value: (analytics.reduce((acc, a) => acc + a.engagement_rate, 0) / (analytics.length || 1)).toFixed(1) + '%', icon: Zap, color: 'text-amber-500', bg: 'bg-amber-50' },
          { label: 'Total Likes', value: analytics.reduce((acc, a) => acc + a.likes, 0), icon: Heart, color: 'text-pink-500', bg: 'bg-pink-50' },
          { label: 'Save Rate', value: (analytics.reduce((acc, a) => acc + (a.saves / (a.views || 1)), 0) / (analytics.length || 1) * 100).toFixed(1) + '%', icon: Bookmark, color: 'text-blue-500', bg: 'bg-blue-50' },
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 relative overflow-hidden group"
          >
            <div className={cn("absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 rounded-full blur-2xl opacity-20 transition-all group-hover:scale-150", stat.bg)} />
            <div className="relative z-10 space-y-4">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shadow-sm", stat.bg)}>
                <stat.icon className={cn("w-5 h-5", stat.color)} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                <p className="text-2xl font-black text-slate-900">
                  {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="overflow-x-auto -mx-8 px-8">
        <table className="w-full border-separate border-spacing-y-4">
          <thead>
            <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <th className="text-left px-6 pb-2">Content Item</th>
              <th className="text-left px-6 pb-2">Platform</th>
              <th className="text-left px-6 pb-2">Track</th>
              <th className="text-right px-6 pb-2">Views</th>
              <th className="text-right px-6 pb-2">Engagement</th>
              <th className="text-right px-6 pb-2">Score</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => {
              const ana = getAnalytics(item.id);
              const release = releases.find(r => r.id === item.track_id);
              return (
                <motion.tr 
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="group bg-white hover:bg-slate-50 transition-all shadow-sm hover:shadow-md rounded-2xl"
                >
                  <td className="px-6 py-5 rounded-l-2xl border-y border-l border-slate-100 group-hover:border-blue-100">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-white/20">
                        <Play className="w-5 h-5 fill-white/10" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-sm font-black text-slate-900 line-clamp-1 italic">"{item.hook}"</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.post_type.replace('_', ' ')}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 border-y border-slate-100 group-hover:border-blue-100">
                    <div className="flex items-center gap-2">
                      {React.createElement(platformIcons[item.platform] || Share2, { className: "w-4 h-4 text-slate-400" })}
                      <span className="text-xs font-bold text-slate-600">{item.platform}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 border-y border-slate-100 group-hover:border-blue-100">
                    {release && (
                      <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-blue-100 w-fit">
                        <Music className="w-2.5 h-2.5" />
                        {release.title}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-5 text-right border-y border-slate-100 group-hover:border-blue-100">
                    <p className="text-sm font-black text-slate-900">{ana?.views?.toLocaleString() || '-'}</p>
                  </td>
                  <td className="px-6 py-5 text-right border-y border-slate-100 group-hover:border-blue-100">
                    <div className="flex items-center justify-end gap-2">
                      <Zap className="w-3 h-3 text-amber-500" />
                      <p className="text-sm font-black text-slate-900">{ana?.engagement_rate?.toFixed(1) || '0.0'}%</p>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right border-y border-slate-100 group-hover:border-blue-100">
                    <div className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                      (ana?.performance_score || 0) > 15 ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                      (ana?.performance_score || 0) > 8 ? "bg-blue-50 text-blue-600 border border-blue-100" :
                      "bg-slate-50 text-slate-500 border border-slate-100"
                    )}>
                      {ana?.performance_score?.toFixed(1) || '0.0'}
                    </div>
                  </td>
                  <td className="px-6 py-5 rounded-r-2xl border-y border-r border-slate-100 group-hover:border-blue-100">
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};
