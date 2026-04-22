import React from 'react';
import { 
  Lightbulb, 
  Video, 
  Zap, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  Eye, 
  Heart, 
  Bookmark,
  Music,
  Smartphone,
  Youtube,
  Instagram,
  Twitter,
  Share2
} from 'lucide-react';
import { ContentItem, ContentStatus, Platform } from '../types';
import { Release } from '../../types';
import { cn } from '../../lib/utils';
import { motion, Reorder } from 'motion/react';

interface ContentPipelineBoardProps {
  items: ContentItem[];
  releases: Release[];
  onEdit?: (item: ContentItem) => void;
  onDelete?: (id: string) => void;
  onPostNow?: (item: ContentItem) => void;
  onStatusChange?: (id: string, newStatus: ContentStatus) => void;
}

const statusColumns: { status: ContentStatus; label: string; icon: any; color: string }[] = [
  { status: 'idea', label: 'Ideas', icon: Lightbulb, color: 'text-amber-500' },
  { status: 'drafting', label: 'Drafting', icon: Video, color: 'text-blue-500' },
  { status: 'ready', label: 'Ready', icon: Sparkles, color: 'text-blue-500' },
  { status: 'scheduled', label: 'Scheduled', icon: Clock, color: 'text-emerald-500' },
  { status: 'posted', label: 'Posted', icon: CheckCircle2, color: 'text-slate-900' },
];

const platformIcons = {
  Instagram: Instagram,
  TikTok: Smartphone,
  YouTube: Youtube,
  Twitter: Twitter,
};

export const ContentPipelineBoard: React.FC<ContentPipelineBoardProps> = ({
  items,
  releases,
  onEdit,
  onDelete,
  onPostNow,
  onStatusChange
}) => {
  return (
    <div className="flex lg:grid lg:grid-cols-5 gap-6 overflow-x-auto pb-8 lg:overflow-x-visible no-scrollbar -mx-4 px-4 lg:mx-0 lg:px-0">
      {statusColumns.map(({ status, label, icon: Icon, color }) => (
        <div key={status} className="space-y-6 min-w-[300px] lg:min-w-0">
          <div className="flex items-center justify-between px-3">
            <div className="flex items-center gap-2.5">
              <div className={cn("p-1.5 rounded-lg bg-white shadow-sm border border-slate-100", color)}>
                <Icon className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-black uppercase tracking-[0.15em] text-slate-500">
                {label}
              </h3>
            </div>
            <span className="text-[10px] font-black bg-slate-100 px-2.5 py-1 rounded-full text-slate-500 border border-slate-200">
              {items.filter(i => i.status === status).length}
            </span>
          </div>
          
          <div className="space-y-4 min-h-[400px] p-2 bg-slate-50/50 rounded-[2rem] border border-dashed border-slate-200">
            {items
              .filter(i => i.status === status)
              .map((item) => (
                <motion.div 
                  layout
                  key={item.id} 
                  onClick={() => {
                    if (item.status === 'ready' || item.status === 'scheduled') {
                      onPostNow?.(item);
                    } else {
                      onEdit?.(item);
                    }
                  }}
                  className="glass-card p-5 hover:border-blue-300 transition-all cursor-pointer group relative overflow-hidden bg-white shadow-sm hover:shadow-xl hover:-translate-y-1"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-slate-50 rounded-xl text-slate-400 group-hover:text-blue-500 transition-colors border border-slate-100">
                        {React.createElement(platformIcons[item.platform] || Share2, { className: "w-4 h-4" })}
                      </div>
                      {item.track_id && (
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-blue-100">
                          <Music className="w-2.5 h-2.5" />
                          {releases.find(r => r.id === item.track_id)?.title || 'Track'}
                        </div>
                      )}
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit?.(item);
                        }}
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete?.(item.id);
                        }}
                        className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <p className="text-sm font-black text-slate-900 leading-tight line-clamp-2">
                      {item.title || item.hook}
                    </p>
                    <p className="text-xs text-slate-500 line-clamp-2 italic font-medium">
                      "{item.hook}"
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {item.scheduled_at ? new Date(item.scheduled_at).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'No Date'}
                      </span>
                    </div>
                    
                    {item.status === 'posted' ? (
                      <div className="flex items-center gap-2 text-emerald-500">
                        <Share2 className="w-3 h-3" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Live</span>
                      </div>
                    ) : (
                      <div className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[8px] font-black uppercase tracking-widest">
                        {item.post_type.replace('_', ' ')}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
};
