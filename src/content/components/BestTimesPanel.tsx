import React from 'react';
import { Sparkles, TrendingUp, Clock, Instagram, Youtube, Music } from 'lucide-react';
import { cn } from '../../lib/utils';
import { BestPostingTime, Platform } from '../types';

interface BestTimesPanelProps {
  bestTimes: BestPostingTime[];
  isLoading: boolean;
}

const PLATFORMS: Platform[] = ['Instagram', 'TikTok', 'YouTube'];

const platformIcon = (platform: Platform) => {
  switch (platform) {
    case 'Instagram': return <Instagram className="w-4 h-4" />;
    case 'TikTok': return <Music className="w-4 h-4" />;
    case 'YouTube': return <Youtube className="w-4 h-4" />;
  }
};

const platformColor = (platform: Platform) => {
  switch (platform) {
    case 'Instagram': return 'text-pink-500 bg-pink-50 border-pink-100';
    case 'TikTok': return 'text-slate-800 bg-slate-50 border-slate-200';
    case 'YouTube': return 'text-red-500 bg-red-50 border-red-100';
  }
};

const platformBarColor = (platform: Platform) => {
  switch (platform) {
    case 'Instagram': return 'from-pink-400 to-rose-400';
    case 'TikTok': return 'from-slate-500 to-slate-700';
    case 'YouTube': return 'from-red-400 to-orange-400';
  }
};

const scoreTextColor = (score: number) => {
  if (score >= 80) return 'text-emerald-600 bg-emerald-50';
  if (score >= 55) return 'text-amber-600 bg-amber-50';
  return 'text-slate-400 bg-slate-100';
};

export function BestTimesPanel({ bestTimes, isLoading }: BestTimesPanelProps) {
  const byPlatform = (platform: Platform) =>
    bestTimes.filter(bt => bt.platform === platform).slice(0, 5);

  return (
    <div className="glass-card overflow-hidden">
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">Best Times to Post</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ranked by avg engagement per platform</p>
          </div>
        </div>
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 text-white text-[9px] font-black uppercase tracking-wider">
          <TrendingUp className="w-2.5 h-2.5" />
          Powered by Zernio
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100">
        {PLATFORMS.map(platform => {
          const slots = byPlatform(platform);
          return (
            <div key={platform} className="p-5 space-y-3">
              <div className={cn('inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-black', platformColor(platform))}>
                {platformIcon(platform)}
                {platform}
              </div>

              {isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-10 rounded-xl bg-slate-100 animate-pulse" />
                  ))}
                </div>
              ) : slots.length === 0 ? (
                <div className="py-6 text-center text-slate-300">
                  <Sparkles className="w-5 h-5 mx-auto mb-1 opacity-40" />
                  <p className="text-xs font-bold">No data yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {slots.map((bt, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex items-center gap-3 p-2.5 rounded-xl border transition-all",
                        i === 0 ? "bg-white border-slate-200 shadow-sm" : "bg-slate-50/50 border-transparent"
                      )}
                    >
                      <span className="text-[10px] font-black text-slate-300 w-3 shrink-0">#{i + 1}</span>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Clock className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                          <span className="text-xs font-black text-slate-800">{bt.day} · {bt.time}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="flex-1 h-1 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={cn("h-full rounded-full bg-gradient-to-r", platformBarColor(platform))}
                              style={{ width: `${bt.score}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <span className={cn("text-[9px] font-black px-1.5 py-0.5 rounded-full shrink-0", scoreTextColor(bt.score))}>
                        {bt.score}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
