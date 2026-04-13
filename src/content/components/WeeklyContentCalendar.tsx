import React from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Clock,
  ExternalLink,
  Instagram,
  Youtube,
  Music,
  Video,
  Plus,
  Sparkles,
  TrendingUp
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { ContentItem, Platform, BestPostingTime } from '../types';
import { motion } from 'framer-motion';

interface WeeklyContentCalendarProps {
  items: ContentItem[];
  onSelectItem: (item: ContentItem) => void;
  onAddPost: (date: Date, time?: string) => void;
  bestTimes?: BestPostingTime[];
}

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function WeeklyContentCalendar({ items, onSelectItem, onAddPost, bestTimes = [] }: WeeklyContentCalendarProps) {
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [showBestTimes, setShowBestTimes] = React.useState(true);

  const getStartOfWeek = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  };

  const startOfWeek = getStartOfWeek(currentDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });

  const toLocalDateStr = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const getItemsForDate = (date: Date) => {
    const dateStr = toLocalDateStr(date);
    return items.filter(item => {
      if (!item.scheduled_at) return false;
      const itemDate = new Date(item.scheduled_at);
      return toLocalDateStr(itemDate) === dateStr;
    });
  };

  const getBestTimesForDay = (date: Date) => {
    const dayName = dayNames[date.getDay()];
    return bestTimes
      .filter(bt => bt.day === dayName)
      .sort((a, b) => b.score - a.score)
      .slice(0, 2);
  };

  const nextWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 7);
    setCurrentDate(d);
  };

  const prevWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 7);
    setCurrentDate(d);
  };

  const getPlatformIcon = (platform: Platform) => {
    switch (platform) {
      case 'Instagram': return <Instagram className="w-3 h-3" />;
      case 'TikTok': return <Music className="w-3 h-3" />;
      case 'YouTube': return <Youtube className="w-3 h-3" />;
      default: return <Video className="w-3 h-3" />;
    }
  };

  const getPlatformColor = (platform: Platform) => {
    switch (platform) {
      case 'Instagram': return 'text-pink-500';
      case 'TikTok': return 'text-slate-700';
      case 'YouTube': return 'text-red-500';
      default: return 'text-blue-500';
    }
  };

  return (
    <div className="glass-card overflow-hidden">
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            <CalendarIcon className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">Weekly Schedule</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Click any slot to add a post</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowBestTimes(!showBestTimes)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border",
              showBestTimes
                ? "bg-amber-50 text-amber-700 border-amber-200"
                : "bg-white text-slate-400 border-slate-200 hover:text-amber-600"
            )}
          >
            <Sparkles className="w-3 h-3" />
            Best Times
          </button>

          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
            <button onClick={prevWeek} className="p-1.5 hover:bg-slate-50 rounded-lg transition-all">
              <ChevronLeft className="w-4 h-4 text-slate-600" />
            </button>
            <span className="px-3 text-xs font-black text-slate-700 min-w-[140px] text-center">
              {startOfWeek.toLocaleDateString('default', { month: 'short', day: 'numeric' })} – {weekDays[6].toLocaleDateString('default', { month: 'short', day: 'numeric' })}
            </span>
            <button onClick={nextWeek} className="p-1.5 hover:bg-slate-50 rounded-lg transition-all">
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
          </div>

          <a 
            href="/calendar" 
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 uppercase tracking-wider"
          >
            Full Calendar
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      <div className="grid grid-cols-7 divide-x divide-slate-100">
        {weekDays.map((date, i) => {
          const dayItems = getItemsForDate(date);
          const dayBestTimes = showBestTimes ? getBestTimesForDay(date) : [];
          const isToday = date.toDateString() === new Date().toDateString();
          const isPast = date < new Date() && !isToday;
          
          return (
            <div 
              key={i} 
              className={cn(
                "min-h-[220px] flex flex-col transition-colors",
                isToday ? "bg-blue-50/30" : isPast ? "bg-slate-50/20" : "hover:bg-slate-50/30"
              )}
            >
              <div className="text-center py-3 border-b border-slate-50">
                <p className={cn(
                  "text-[10px] font-black uppercase tracking-widest mb-1",
                  isToday ? "text-blue-600" : "text-slate-400"
                )}>
                  {date.toLocaleDateString('default', { weekday: 'short' })}
                </p>
                <span className={cn(
                  "text-sm font-black w-8 h-8 flex items-center justify-center rounded-full mx-auto",
                  isToday ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "text-slate-900"
                )}>
                  {date.getDate()}
                </span>
              </div>

              <div className="flex-1 p-2 space-y-1.5">
                {dayItems.map(item => (
                  <motion.button
                    key={item.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onSelectItem(item)}
                    className={cn(
                      "w-full text-left p-2 rounded-xl border text-[10px] font-bold shadow-sm transition-all",
                      item.status === 'posted' ? "bg-emerald-50 border-emerald-100 text-emerald-700" :
                      item.status === 'scheduled' ? "bg-blue-50 border-blue-100 text-blue-700" :
                      item.publish_status === 'failed' ? "bg-red-50 border-red-100 text-red-700" :
                      "bg-white border-slate-100 text-slate-600"
                    )}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <div className={cn(
                        "p-0.5 rounded",
                        item.status === 'posted' ? "bg-emerald-100" :
                        item.status === 'scheduled' ? "bg-blue-100" : "bg-slate-100"
                      )}>
                        {getPlatformIcon(item.platform)}
                      </div>
                      <span className="truncate flex-1">{item.title}</span>
                    </div>
                    {item.scheduled_at && (
                      <div className="flex items-center gap-1 opacity-60">
                        <Clock className="w-2.5 h-2.5" />
                        <span>{new Date(item.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    )}
                  </motion.button>
                ))}

                {dayBestTimes.length > 0 && (
                  <div className="space-y-1 mt-auto pt-1">
                    {dayBestTimes.map((bt, j) => (
                      <button
                        key={j}
                        onClick={() => onAddPost(date, bt.time)}
                        className="w-full flex items-center gap-1 px-1.5 py-1 rounded-lg bg-amber-50/60 border border-amber-100/50 text-[9px] font-bold text-amber-600 hover:bg-amber-100/80 transition-all group"
                      >
                        <TrendingUp className="w-2.5 h-2.5 text-amber-400 group-hover:text-amber-600" />
                        <span className={getPlatformColor(bt.platform)}>{bt.platform.slice(0, 2)}</span>
                        <span>{bt.time}</span>
                        <Plus className="w-2.5 h-2.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </div>
                )}

                {dayItems.length === 0 && dayBestTimes.length === 0 && (
                  <button
                    onClick={() => onAddPost(date)}
                    className="w-full h-full min-h-[60px] flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-transparent hover:border-blue-200 hover:bg-blue-50/20 transition-all group"
                  >
                    <Plus className="w-4 h-4 text-slate-200 group-hover:text-blue-400 transition-colors" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
