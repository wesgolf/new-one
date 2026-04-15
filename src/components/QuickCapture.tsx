import React, { useState } from 'react';
import { Send, Sparkles, Lightbulb, CheckSquare, UserPlus, StickyNote, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { getCurrentAuthUser } from '../lib/auth';
import { cn } from '../lib/utils';

interface QuickCaptureProps {
  onSuccess?: (content: string) => void;
}

export function QuickCapture({ onSuccess }: QuickCaptureProps) {
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<'Idea' | 'Task' | 'Note' | 'Contact'>('Idea');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      const user = await getCurrentAuthUser();
      const { error } = await supabase.from('inbox').insert([{
        content,
        category,
        user_id: user?.id
      }]);

      if (error) throw error;

      setContent('');
      setShowSuccess(true);
      onSuccess?.(content);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (err) {
      console.error('Quick capture error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = [
    { id: 'Idea', icon: Lightbulb, color: 'text-amber-500', bg: 'bg-amber-50' },
    { id: 'Task', icon: CheckSquare, color: 'text-blue-500', bg: 'bg-blue-50' },
    { id: 'Note', icon: StickyNote, color: 'text-purple-500', bg: 'bg-purple-50' },
    { id: 'Contact', icon: UserPlus, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  ];

  return (
    <div className="glass-card p-4 relative overflow-hidden group">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 bg-indigo-50 rounded-lg">
          <Sparkles className="w-4 h-4 text-indigo-600" />
        </div>
        <h3 className="text-sm font-bold text-slate-900">Quick Capture</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Dump an idea, task, or contact..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
          />
          <button
            type="submit"
            disabled={isSubmitting || !content.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategory(cat.id as any)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                category === cat.id 
                  ? cn(cat.bg, cat.color, "ring-1 ring-inset ring-current")
                  : "bg-slate-50 text-slate-400 hover:bg-slate-100"
              )}
            >
              <cat.icon className="w-3 h-3" />
              {cat.id}
            </button>
          ))}
        </div>
      </form>

      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-emerald-500/95 backdrop-blur-sm flex items-center justify-center text-white z-10"
          >
            <div className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5" />
              <span className="font-bold">Captured to Inbox</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
