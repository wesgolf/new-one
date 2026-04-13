import React from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Clock,
  ExternalLink,
  Instagram,
  Youtube,
  Twitter,
  Music,
  Video
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { ContentItem, Platform } from '../types';
import { motion } from 'framer-motion';

interface WeeklyContentCalendarProps {
  items: ContentItem[];
  onSelectItem: (item: ContentItem) => void;
}

export function WeeklyContentCalendar({ items, onSelectItem }: WeeklyContentCalendarProps) {
  const [currentDate, setCurrentDate] = React.useState(new Date());

  // Get start of current week (Sunday)
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

  const getItemsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return items.filter(item => {
      if (!item.scheduled_at) return false;
      return item.scheduled_at.startsWith(dateStr);
    });
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
      case 'Twitter': return <Twitter className="w-3 h-3" />;
      default: return <Video className="w-3 h-3" />;
    }
  };

  return (
    <div className="glass-card overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            <CalendarIcon className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">Weekly Schedule</h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Content Roadmap</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
            <button onClick={prevWeek} className="p-1.5 hover:bg-slate-50 rounded-lg transition-all">
              <ChevronLeft className="w-4 h-4 text-slate-600" />
            </button>
            <span className="px-3 text-xs font-black text-slate-700 min-w-[140px] text-center">
              {startOfWeek.toLocaleDateString('default', { month: 'short', day: 'numeric' })} - {weekDays[6].toLocaleDateString('default', { month: 'short', day: 'numeric' })}
            </span>
            <button onClick={nextWeek} className="p-1.5 hover:bg-slate-50 rounded-lg transition-all">
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
          </div>
          
          <a 
            href="/calendar" 
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-black hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
          >
            Full Calendar
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      <div className="grid grid-cols-7 divide-x divide-slate-100">
        {weekDays.map((date, i) => {
          const dayItems = getItemsForDate(date);
          const isToday = date.toDateString() === new Date().toDateString();
          
          return (
            <div 
              key={i} 
              className={cn(
                "min-h-[200px] p-3 transition-colors",
                isToday ? "bg-blue-50/30" : "hover:bg-slate-50/30"
              )}
            >
              <div className="text-center mb-4">
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

              <div className="space-y-2">
                {dayItems.map(item => (
                  <motion.button
                    key={item.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onSelectItem(item)}
                    className={cn(
                      "w-full text-left p-2 rounded-xl border text-[10px] font-bold shadow-sm transition-all group",
                      item.status === 'posted' ? "bg-emerald-50 border-emerald-100 text-emerald-700" :
                      item.status === 'scheduled' ? "bg-blue-50 border-blue-100 text-blue-700" :
                      "bg-white border-slate-100 text-slate-600"
                    )}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className={cn(
                        "p-1 rounded-md",
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
                
                {dayItems.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center py-8 opacity-20 group-hover:opacity-40 transition-opacity">
                    <div className="w-8 h-8 border-2 border-dashed border-slate-300 rounded-lg" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
