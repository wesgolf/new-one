import React from 'react';
import { 
  X, 
  Send, 
  Clock, 
  Sparkles, 
  Play, 
  Target, 
  CheckCircle2, 
  Loader2, 
  Music, 
  Smartphone, 
  Youtube, 
  Instagram, 
  Twitter,
  ChevronRight,
  Edit2
} from 'lucide-react';
import { ContentItem, Platform } from '../types';
import { Release } from '../../types';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface PostModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ContentItem | null;
  release?: Release;
  onPost: (item: ContentItem) => Promise<void>;
  onSchedule: (item: ContentItem, date: string) => Promise<void>;
  onEdit: (item: ContentItem) => void;
}

const platformIcons = {
  Instagram: Instagram,
  TikTok: Smartphone,
  YouTube: Youtube,
  Twitter: Twitter,
};

export const PostModeModal: React.FC<PostModeModalProps> = ({
  isOpen,
  onClose,
  item,
  release,
  onPost,
  onSchedule,
  onEdit
}) => {
  const [isPosting, setIsPosting] = React.useState(false);
  const [isScheduled, setIsScheduled] = React.useState(false);

  if (!isOpen || !item) return null;

  const handlePost = async () => {
    setIsPosting(true);
    try {
      await onPost(item);
      setIsScheduled(true);
      setTimeout(() => {
        onClose();
        setIsScheduled(false);
        setIsPosting(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to post:', err);
      setIsPosting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/80 backdrop-blur-md"
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-4xl bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col lg:flex-row h-[85vh] lg:h-auto max-h-[85vh]"
      >
        {/* Left Side: Preview */}
        <div className="w-full lg:w-[360px] bg-slate-900 p-8 flex flex-col items-center justify-center relative overflow-hidden border-r border-white/10">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-600/20 via-transparent to-black/60" />
          
          <div className="relative w-full aspect-[9/16] bg-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden border-4 border-white/10 group">
            <div className="absolute inset-0 flex items-center justify-center">
              <Play className="w-16 h-16 text-white/20 fill-white/10" />
            </div>
            <div className="absolute bottom-8 left-8 right-8 space-y-4">
              <div className="h-2 w-full bg-white/20 rounded-full" />
              <div className="h-2 w-2/3 bg-white/20 rounded-full" />
            </div>
          </div>

          <div className="mt-8 text-center space-y-2 relative z-10">
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Previewing for</p>
            <div className="flex items-center justify-center gap-2 text-white">
              {React.createElement(platformIcons[item.platform], { className: "w-5 h-5" })}
              <span className="text-xl font-black">{item.platform}</span>
            </div>
          </div>
        </div>

        {/* Right Side: Execution Controls */}
        <div className="flex-1 p-8 lg:p-12 overflow-y-auto custom-scrollbar flex flex-col">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <Target className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Execution Mode</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
              <X className="w-6 h-6 text-slate-400" />
            </button>
          </div>

          <div className="flex-1 space-y-10">
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">The Hook</label>
                <p className="text-2xl font-black text-slate-900 italic leading-tight">"{item.hook}"</p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Caption</label>
                <p className="text-sm font-bold text-slate-600 leading-relaxed">{item.caption}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {item.hashtags.map(tag => (
                  <span key={tag} className="px-2 py-1 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-200">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="p-5 bg-slate-50 rounded-[2rem] border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Linked Track</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-xl border border-slate-200 flex items-center justify-center shadow-sm">
                    <Music className="w-5 h-5 text-blue-500" />
                  </div>
                  <p className="text-sm font-black text-slate-900">{release?.title || 'No Track'}</p>
                </div>
              </div>
              <div className="p-5 bg-slate-50 rounded-[2rem] border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Post Format</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-xl border border-slate-200 flex items-center justify-center shadow-sm">
                    <Sparkles className="w-5 h-5 text-purple-500" />
                  </div>
                  <p className="text-sm font-black text-slate-900 uppercase tracking-widest">{item.post_type.replace('_', ' ')}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-10 mt-10 border-t border-slate-100 flex flex-col sm:flex-row gap-4">
            <button 
              onClick={handlePost}
              disabled={isPosting || isScheduled}
              className={cn(
                "flex-1 py-5 rounded-[1.5rem] font-black text-sm shadow-2xl transition-all flex items-center justify-center gap-3",
                isScheduled 
                  ? "bg-emerald-500 text-white shadow-emerald-500/20" 
                  : "bg-blue-600 text-white shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98]"
              )}
            >
              {isPosting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Posting via Zernio...
                </>
              ) : isScheduled ? (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Success!
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Post via Zernio
                </>
              )}
            </button>
            <button 
              onClick={() => onEdit(item)}
              className="px-8 py-5 bg-white border-2 border-slate-100 text-slate-600 rounded-[1.5rem] font-black text-sm hover:bg-slate-50 hover:border-slate-200 transition-all flex items-center justify-center gap-2"
            >
              <Edit2 className="w-4 h-4" />
              Edit First
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
