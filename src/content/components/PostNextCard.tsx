import React from 'react';
import { Sparkles, Play, RefreshCw, Clock, Music, Smartphone, Youtube, Instagram, Twitter, Share2 } from 'lucide-react';
import { ContentPlanSuggestion } from '../types';
import { Release } from '../../types';
import { cn } from '../../lib/utils';
import { motion } from 'motion/react';

interface PostNextCardProps {
  suggestion: ContentPlanSuggestion | null;
  focusTrack: Release | null;
  onPostNow: (suggestion: ContentPlanSuggestion) => void;
  onGenerateNew: () => void;
  onSaveDraft: (suggestion: ContentPlanSuggestion) => void;
  loading?: boolean;
}

const platformIcons = {
  Instagram: Instagram,
  TikTok: Smartphone,
  YouTube: Youtube,
  Twitter: Twitter,
};

export const PostNextCard: React.FC<PostNextCardProps> = ({
  suggestion,
  focusTrack,
  onPostNow,
  onGenerateNew,
  onSaveDraft,
  loading = false
}) => {
  if (!suggestion || !focusTrack) {
    return (
      <div className="glass-card p-10 flex flex-col items-center justify-center text-center space-y-4 min-h-[300px]">
        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
          <Sparkles className="w-8 h-8 text-slate-300" />
        </div>
        <div className="space-y-1">
          <h3 className="text-xl font-black text-slate-900">No Recommendations Yet</h3>
          <p className="text-slate-500 text-sm max-w-xs mx-auto">Add some releases or post history to get strategic content suggestions.</p>
        </div>
        <button 
          onClick={onGenerateNew}
          className="px-6 py-2 bg-slate-900 text-white rounded-xl font-bold text-sm hover:scale-105 transition-all"
        >
          Generate First Idea
        </button>
      </div>
    );
  }

  return (
    <motion.section 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative group"
    >
      <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-[2.5rem] blur opacity-20 group-hover:opacity-30 transition duration-1000 group-hover:duration-200" />
      <div className="relative glass-card p-8 md:p-10 bg-white/80 backdrop-blur-xl border-blue-100 overflow-hidden">
        {/* Background Accent */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl" />
        
        <div className="flex flex-col lg:flex-row items-center gap-10 relative z-10">
          <div className="flex-1 space-y-6">
            <div className="flex items-center gap-3">
              <div className="px-3 py-1 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-blue-200">
                Post This Next
              </div>
              <div className="px-3 py-1 bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-full">
                Priority: {suggestion.priority_score}/10
              </div>
              <button 
                onClick={onGenerateNew}
                disabled={loading}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
                title="Generate New Idea"
              >
                <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              </button>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <h3 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight italic tracking-tight">
                  "{suggestion.title}"
                </h3>
                <p className="text-slate-600 text-lg font-medium leading-relaxed max-w-2xl">
                  {suggestion.description}
                </p>
                
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-2">
                  <div className="flex items-center gap-2 text-slate-500">
                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                      <Music className="w-4 h-4 text-blue-500" />
                    </div>
                    <span className="text-sm font-bold text-slate-700">{focusTrack.title}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500">
                    <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">
                      <Clock className="w-4 h-4 text-purple-500" />
                    </div>
                    <span className="text-sm font-bold text-slate-700">Best Time: {new Date(suggestion.suggested_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500">
                    <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center">
                      {React.createElement(platformIcons[suggestion.suggested_platform] || Share2, { className: "w-4 h-4 text-slate-400" })}
                    </div>
                    <span className="text-sm font-bold text-slate-700">{suggestion.suggested_platform}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-4 h-4 text-blue-500 mt-1" />
                  <div>
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Strategy Rationale</p>
                    <p className="text-sm text-slate-600 font-medium">{suggestion.rationale}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
                <button 
                  onClick={() => onPostNow(suggestion)}
                  className="w-full sm:w-auto px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-sm shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 group/btn"
                >
                  <Play className="w-4 h-4 fill-white group-hover/btn:scale-110 transition-transform" />
                  Post Now
                </button>
                <button 
                  onClick={() => onSaveDraft(suggestion)}
                  className="w-full sm:w-auto px-8 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
                >
                  Save as Draft
                </button>
              </div>
            </div>
          </div>

          {/* Visual Preview Placeholder */}
          <div className="w-full lg:w-72 aspect-[9/16] bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden relative border-[6px] border-white group/preview">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center group-hover/preview:scale-110 transition-transform">
                <Play className="w-6 h-6 text-white fill-white ml-1" />
              </div>
            </div>
            <div className="absolute bottom-8 left-8 right-8 space-y-4">
              <div className="space-y-2">
                <div className="h-2 w-full bg-white/30 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="h-full bg-white/60"
                  />
                </div>
                <div className="h-2 w-2/3 bg-white/20 rounded-full" />
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-white/20 rounded-full" />
                <div className="h-2 w-16 bg-white/20 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
};
