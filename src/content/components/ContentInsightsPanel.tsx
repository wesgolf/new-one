import React from 'react';
import { 
  Sparkles, 
  TrendingUp, 
  Zap, 
  Clock, 
  Target, 
  MessageSquare, 
  Eye, 
  Heart,
  ChevronRight,
  BarChart3,
  Smartphone,
  Youtube,
  Instagram,
  Twitter
} from 'lucide-react';
import { ContentItem, ContentAnalytics, Platform, PostType } from '../types';
import { cn } from '../../lib/utils';
import { motion } from 'motion/react';

interface ContentInsightsPanelProps {
  items: ContentItem[];
  analytics: ContentAnalytics[];
}

const platformIcons = {
  Instagram: Instagram,
  TikTok: Smartphone,
  YouTube: Youtube,
  Twitter: Twitter,
};

export const ContentInsightsPanel: React.FC<ContentInsightsPanelProps> = ({
  items,
  analytics
}) => {
  // Mocking insights data
  const topHooks = [
    { hook: "POV: You found the track of the summer 🌴", views: 45200, engagement: 12.4 },
    { hook: "I spent 40 hours on this lead synth... 🎹", views: 32100, engagement: 10.8 },
    { hook: "Wait for the second drop... 🤯", views: 28400, engagement: 9.5 }
  ];

  const bestWindows = [
    { window: 'Wed 8:00 PM', engagement: 15.4 },
    { window: 'Fri 7:30 PM', engagement: 12.8 },
    { window: 'Mon 9:00 PM', engagement: 10.2 }
  ];

  const formatLeaderboard = [
    { format: 'Drop Clip', avgEngagement: 14.2, count: 12 },
    { format: 'Tutorial', avgEngagement: 11.8, count: 8 },
    { format: 'Teaser', avgEngagement: 9.5, count: 15 }
  ];

  return (
    <section className="glass-card p-8 lg:p-10 space-y-10 bg-slate-900 text-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-black text-white tracking-tight">Content Insights</h3>
            <p className="text-slate-400 font-medium text-sm">Strategic patterns detected across your growth engine.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {/* Top Hooks */}
        <div className="space-y-6">
          <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-2">
            <Zap className="w-3.5 h-3.5" />
            Top Performing Hooks
          </h4>
          <div className="space-y-4">
            {topHooks.map((hook, i) => (
              <div key={i} className="p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all group">
                <p className="text-sm font-black italic mb-2 leading-tight">"{hook.hook}"</p>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <Eye className="w-3 h-3 text-slate-500" />
                    <span className="text-[10px] font-bold text-slate-400">{(hook.views / 1000).toFixed(1)}k</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-3 h-3 text-amber-500" />
                    <span className="text-[10px] font-bold text-slate-400">{hook.engagement}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Best Posting Windows */}
        <div className="space-y-6">
          <h4 className="text-[10px] font-black text-purple-400 uppercase tracking-widest flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" />
            Best Posting Windows
          </h4>
          <div className="space-y-4">
            {bestWindows.map((window, i) => (
              <div key={i} className="flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all">
                <div className="space-y-1">
                  <p className="text-sm font-black text-white">{window.window}</p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Avg. Engagement</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-purple-400">{window.engagement}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Format Leaderboard */}
        <div className="space-y-6">
          <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">
            <BarChart3 className="w-3.5 h-3.5" />
            Format Leaderboard
          </h4>
          <div className="space-y-4">
            {formatLeaderboard.map((format, i) => (
              <div key={i} className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-300">{format.format}</span>
                  <span className="text-[10px] font-bold text-slate-500">{format.avgEngagement}% Engagement</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/10">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(format.avgEngagement / 15) * 100}%` }}
                    transition={{ duration: 1, delay: i * 0.1 }}
                    className="h-full bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="p-6 bg-blue-600 rounded-[2rem] shadow-xl shadow-blue-900/20 mt-8">
            <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-2">Strategic Advice</p>
            <p className="text-sm font-bold leading-relaxed">
              Your <span className="text-white">Tutorial Reels</span> are driving 3x more saves. Double down on "How I made this" content for your next release.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
