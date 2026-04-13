import React from 'react';
import { Sparkles, TrendingUp, Clock } from 'lucide-react';
import { cn } from '../../lib/utils';
import { BestPostingTime } from '../types';

interface BestTimesPanelProps {
  bestTimes: BestPostingTime[];
  isLoading: boolean;
}

const scoreColor = (score: number) => {
  if (score >= 80) return 'from-emerald-400 to-teal-400';
  if (score >= 55) return 'from-amber-400 to-orange-400';
  return 'from-slate-300 to-slate-400';
};

const scoreBadgeColor = (score: number) => {
  if (score >= 80) return 'text-emerald-600 bg-emerald-50';
  if (score >= 55) return 'text-amber-600 bg-amber-50';
  return 'text-slate-500 bg-slate-100';
};

export function BestTimesPanel({ bestTimes, isLoading }: BestTimesPanelProps) {
  const top = bestTimes.slice(0, 8);

  return (
    <div className="glass-card overflow-hidden">
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">Best Times to Post</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Based on your real post performance</p>
          </div>
        </div>
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 text-white text-[9px] font-black uppercase tracking-wider">
          <TrendingUp className="w-2.5 h-2.5" />
          Powered by Zernio
        </span>
      </div>

      <div className="p-5">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-16 rounded-2xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : top.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-bold">No data yet</p>
            <p className="text-xs">Post more content to unlock your best times</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {top.map((bt, i) => (
              <div
                key={i}
                className={cn(
                  "relative flex flex-col gap-2 p-3.5 rounded-2xl border transition-all",
                  i === 0
                    ? "bg-amber-50 border-amber-100 shadow-sm shadow-amber-100"
                    : "bg-white border-slate-100 hover:border-slate-200"
                )}
              >
                {i === 0 && (
                  <span className="absolute top-2 right-2 text-[8px] font-black text-amber-500 uppercase tracking-wider">
                    Top Pick
                  </span>
                )}

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-300">#{i + 1}</span>
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span className="text-xs font-black text-slate-700">{bt.time}</span>
                </div>

                <p className="text-sm font-black text-slate-900 leading-tight">{bt.day}</p>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden mr-2">
                      <div
                        className={cn("h-full rounded-full bg-gradient-to-r", scoreColor(bt.score))}
                        style={{ width: `${bt.score}%` }}
                      />
                    </div>
                    <span className={cn("text-[9px] font-black px-1.5 py-0.5 rounded-full", scoreBadgeColor(bt.score))}>
                      {bt.score}
                    </span>
                  </div>
                  {bt.label && (
                    <p className="text-[9px] text-slate-400 font-medium truncate">{bt.label}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
