import React, { useState, useEffect } from 'react';
import { X, Layout, ExternalLink, Loader2, Music } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ContentItem, Release } from '../types';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';

interface LinkedContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  release: Release | null;
}

export function LinkedContentModal({ isOpen, onClose, release }: LinkedContentModalProps) {
  const [linkedContent, setLinkedContent] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && release) {
      fetchLinkedContent(release.id);
    }
  }, [isOpen, release]);

  const fetchLinkedContent = async (releaseId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('content_items')
        .select('*')
        .eq('linked_release_id', releaseId)
        .order('scheduled_date', { ascending: false });
      
      if (error) throw error;
      setLinkedContent(data || []);
    } catch (err) {
      console.error('Failed to fetch linked content:', err);
    } finally {
      setIsLoading(true);
      // Small delay for smooth transition
      setTimeout(() => setIsLoading(false), 300);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 flex flex-col overflow-hidden max-h-[80vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-600 rounded-2xl shadow-lg shadow-purple-200">
              <Layout className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">
                Linked Content
              </h3>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-widest mt-0.5">
                {release?.title || 'Track'} Rollout
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2.5 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-white">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-10 h-10 text-purple-600 animate-spin" />
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Fetching Content Rollout...</p>
            </div>
          ) : linkedContent.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {linkedContent.map(item => (
                <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-purple-200 transition-all">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-sm",
                      item.platform === 'Instagram' && "bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500",
                      item.platform === 'TikTok' && "bg-black",
                      item.platform === 'YouTube' && "bg-red-600",
                      item.platform === 'Twitter' && "bg-blue-400"
                    )}>
                      {item.platform[0]}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{item.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                          {item.scheduled_date ? new Date(item.scheduled_date).toLocaleDateString() : 'No Date'}
                        </span>
                        <span className="w-1 h-1 bg-slate-300 rounded-full" />
                        <span className={cn(
                          "text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full",
                          item.status === 'posted' ? "bg-emerald-100 text-emerald-600" : "bg-slate-200 text-slate-500"
                        )}>
                          {item.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button className="p-2 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-slate-200">
                    <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-purple-600 transition-colors" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
              <Music className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No content linked to this track</p>
              <p className="text-xs text-slate-400 mt-2">Link posts to this track in the Calendar or Content page.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-slate-50/50">
          <button 
            onClick={onClose}
            className="w-full py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-colors"
          >
            Close Rollout View
          </button>
        </div>
      </motion.div>
    </div>
  );
}
