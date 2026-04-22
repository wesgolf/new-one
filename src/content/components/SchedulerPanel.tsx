import React from 'react';
import { 
  Calendar, 
  Sparkles, 
  Clock, 
  Target, 
  Music, 
  Smartphone, 
  Youtube, 
  Instagram, 
  Twitter,
  ChevronRight,
  Plus,
  Zap,
  ArrowRight
} from 'lucide-react';
import { ContentPlanSuggestion, Platform, PostType } from '../types';
import { Release } from '../../types';
import { cn } from '../../lib/utils';
import { motion } from 'motion/react';

interface SchedulerPanelProps {
  suggestions: ContentPlanSuggestion[];
  releases: Release[];
  onAddSuggestion: (suggestion: ContentPlanSuggestion) => void;
}

const platformIcons = {
  Instagram: Instagram,
  TikTok: Smartphone,
  YouTube: Youtube,
  Twitter: Twitter,
};

export const SchedulerPanel: React.FC<SchedulerPanelProps> = ({
  suggestions,
  releases,
  onAddSuggestion
}) => {
  const dailySuggestions = suggestions.filter(s => s.type === 'daily');
  const campaignSuggestions = suggestions.filter(s => s.type === 'release_campaign');

  return (
    <section className="glass-card p-8 lg:p-10 space-y-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center">
            <Calendar className="w-6 h-6 text-emerald-600" />
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">AI Content Scheduler</h3>
            <p className="text-slate-500 font-medium text-sm">Strategic planning based on releases and goals.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Weekly Plan */}
        <div className="space-y-8">
          <div className="flex items-center justify-between px-2">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              Weekly Consistency Plan
            </h4>
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">7 Posts Planned</span>
          </div>

          <div className="space-y-4">
            {dailySuggestions.map((suggestion, i) => (
              <motion.div 
                key={suggestion.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center justify-between p-5 bg-slate-50 rounded-[2rem] border border-slate-100 hover:border-blue-200 hover:bg-white hover:shadow-lg transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white rounded-xl border border-slate-200 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                    {React.createElement(platformIcons[suggestion.suggested_platform], { className: "w-5 h-5 text-slate-400" })}
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-sm font-black text-slate-900">{suggestion.title}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {new Date(suggestion.suggested_date).toLocaleDateString([], { weekday: 'long', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => onAddSuggestion(suggestion)}
                  className="p-2 hover:bg-blue-50 rounded-xl text-slate-400 hover:text-blue-600 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Campaign Plan */}
        <div className="space-y-8">
          <div className="flex items-center justify-between px-2">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Target className="w-3.5 h-3.5 text-blue-500" />
              Release Campaign: "{releases[0]?.title || 'Upcoming Release'}"
            </h4>
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Active Campaign</span>
          </div>

          <div className="relative space-y-6 pl-8 border-l-2 border-slate-100 ml-4">
            {campaignSuggestions.map((suggestion, i) => (
              <motion.div 
                key={suggestion.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="relative group"
              >
                <div className="absolute -left-[41px] top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-slate-200 rounded-full z-10 group-hover:border-blue-500 transition-colors" />
                <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 hover:border-blue-200 hover:bg-white hover:shadow-lg transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[8px] font-black uppercase tracking-widest border border-blue-100">
                        {suggestion.suggested_post_type.replace('_', ' ')}
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {new Date(suggestion.suggested_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <button 
                      onClick={() => onAddSuggestion(suggestion)}
                      className="p-1.5 hover:bg-blue-50 rounded-lg text-slate-400 hover:text-blue-600 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-sm font-black text-slate-900 mb-1">{suggestion.title}</p>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">{suggestion.description}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="p-6 bg-slate-900 rounded-[2rem] shadow-xl shadow-slate-900/20 group cursor-pointer hover:scale-[1.02] transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-emerald-400">
                <Sparkles className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Campaign Strategy</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-600 group-hover:translate-x-1 group-hover:text-emerald-400 transition-all" />
            </div>
            <p className="text-sm font-bold text-white leading-relaxed">
              Focus on <span className="text-emerald-400">TikTok Duets</span> for this release. Early data shows 2.4x higher conversion to Spotify from duet content.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
