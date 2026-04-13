import React from 'react';
import { 
  MessageSquare, 
  Heart, 
  Share2, 
  ExternalLink, 
  Instagram, 
  Smartphone, 
  Youtube, 
  Twitter,
  ChevronRight,
  User,
  Clock
} from 'lucide-react';
import { Platform } from '../types';
import { cn } from '../../lib/utils';
import { motion } from 'framer-motion';

interface EngagementHubProps {
  onOpenPlatform: (platform: Platform) => void;
}

const platformIcons = {
  Instagram: Instagram,
  TikTok: Smartphone,
  YouTube: Youtube,
  Twitter: Twitter,
};

export const EngagementHub: React.FC<EngagementHubProps> = ({
  onOpenPlatform
}) => {
  // Mocking recent comments
  const recentComments = [
    { id: 1, user: 'alex_beats', platform: 'Instagram' as Platform, text: "This drop is absolutely insane! 🔥 When is it out?", time: '2m ago' },
    { id: 2, user: 'dj_producer_99', platform: 'TikTok' as Platform, text: "Need the tutorial for that lead synth! 🎹", time: '15m ago' },
    { id: 3, user: 'music_lover_x', platform: 'YouTube' as Platform, text: "Best track of the year so far. 🚀", time: '1h ago' },
  ];

  return (
    <section className="glass-card p-8 lg:p-10 space-y-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-pink-50 rounded-2xl flex items-center justify-center">
            <MessageSquare className="w-6 h-6 text-pink-600" />
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Engagement Hub</h3>
            <p className="text-slate-500 font-medium text-sm">Quick awareness of recent social activity.</p>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        <div className="grid grid-cols-2 gap-4">
          {(['Instagram', 'TikTok', 'YouTube', 'Twitter'] as const).map(p => (
            <button
              key={p}
              onClick={() => onOpenPlatform(p)}
              className="flex items-center justify-between p-5 bg-slate-50 rounded-[2rem] border border-slate-100 hover:border-blue-200 hover:bg-white hover:shadow-lg transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-xl border border-slate-200 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                  {React.createElement(platformIcons[p], { className: "w-5 h-5 text-slate-400" })}
                </div>
                <span className="text-sm font-black text-slate-900">{p}</span>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
            </button>
          ))}
        </div>

        <div className="space-y-6">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-2">
            <Clock className="w-3.5 h-3.5 text-blue-500" />
            Recent Activity
          </h4>
          <div className="space-y-4">
            {recentComments.map((comment, i) => (
              <motion.div 
                key={comment.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="p-5 bg-slate-50 rounded-[2rem] border border-slate-100 hover:border-pink-200 hover:bg-white hover:shadow-lg transition-all group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white rounded-lg border border-slate-200 flex items-center justify-center shadow-sm">
                      <User className="w-4 h-4 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-900">@{comment.user}</p>
                      <div className="flex items-center gap-1.5">
                        {React.createElement(platformIcons[comment.platform], { className: "w-2.5 h-2.5 text-slate-400" })}
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{comment.platform}</span>
                      </div>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{comment.time}</span>
                </div>
                <p className="text-sm font-bold text-slate-600 leading-relaxed italic">
                  "{comment.text}"
                </p>
                <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-slate-100 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="text-[10px] font-black text-pink-600 uppercase tracking-widest hover:text-pink-700">Reply Natively</button>
                  <ChevronRight className="w-3.5 h-3.5 text-pink-600" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
