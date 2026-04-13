import React from 'react';
import { Clock, Sparkles, Loader2, TrendingUp } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Platform, BestPostingTime } from '../types';
import { zernioAdapter } from '../services/zernioAdapter';

interface BestPostingTimesProps {
  platform: Platform;
  onSelectTime: (date: string, time: string) => void;
  selectedDate?: string;
}

export function BestPostingTimes({ platform, onSelectTime, selectedDate }: BestPostingTimesProps) {
  const [times, setTimes] = React.useState<BestPostingTime[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);

  React.useEffect(() => {
    const fetchTimes = async () => {
      setLoading(true);
      try {
        const result = await zernioAdapter.getBestPostingTimes(platform);
        setTimes(result);
      } catch {
        setTimes([]);
      } finally {
        setLoading(false);
      }
    };
    fetchTimes();
  }, [platform]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-100">
        <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin" />
        <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Loading best times...</span>
      </div>
    );
  }

  if (times.length === 0) return null;

  const displayTimes = expanded ? times : times.slice(0, 4);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
        <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Best Times to Post</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {displayTimes.map((bt, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              const targetDate = selectedDate || new Date().toISOString().split('T')[0];
              onSelectTime(targetDate, bt.time);
            }}
            className="flex items-center gap-2 p-2.5 bg-amber-50 hover:bg-amber-100 border border-amber-100 rounded-xl transition-all group text-left"
          >
            <div className="p-1.5 bg-white rounded-lg shadow-sm group-hover:shadow-md transition-shadow">
              <Clock className="w-3 h-3 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-amber-900">{bt.time}</span>
                <span className="text-[9px] text-amber-500 font-bold">{bt.day}</span>
              </div>
              <div className="flex items-center gap-1">
                <TrendingUp className="w-2.5 h-2.5 text-amber-500" />
                <span className="text-[9px] font-bold text-amber-600">{bt.label || `Score: ${bt.score}`}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
      {times.length > 4 && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-[10px] font-bold text-amber-600 hover:text-amber-700 uppercase tracking-widest"
        >
          {expanded ? 'Show less' : `Show ${times.length - 4} more`}
        </button>
      )}
    </div>
  );
}
