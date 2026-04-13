import React from 'react';
import { 
  Lightbulb, 
  Calendar, 
  CheckCircle2, 
  Plus, 
  PenTool, 
  Layout, 
  ArrowRight,
  MoreVertical
} from 'lucide-react';
import { cn } from '../lib/utils';

const mockContentData = {
  ideasReady: 12,
  postsThisWeek: 4,
  scheduledContent: 3,
  nextPostDate: 'Tomorrow, 7:00 PM'
};

interface ContentData {
  ideasReady: number;
  postsThisWeek: number;
  scheduledContent: number;
  nextPostDate: string;
}

export function ContentEnginePanel({ data, onAction }: { data?: ContentData | null, onAction?: (msg: string) => void }) {
  const content = data || { ideasReady: 0, postsThisWeek: 0, scheduledContent: 0, nextPostDate: 'No posts scheduled' };
  
  return (
    <section className="glass-card p-8 group hover:border-purple-200 transition-all">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Layout className="w-5 h-5 text-purple-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">Content Engine</h3>
        </div>
        <button className="p-2 hover:bg-slate-50 rounded-lg transition-all text-slate-400 hover:text-slate-600">
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Ideas Ready</p>
          <p className="text-2xl font-bold text-slate-900">{content.ideasReady}</p>
        </div>
        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Posts This Week</p>
          <p className="text-2xl font-bold text-slate-900">{content.postsThisWeek}</p>
        </div>
        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Scheduled</p>
          <p className="text-2xl font-bold text-slate-900">{content.scheduledContent}</p>
        </div>
      </div>

      <div className="p-4 bg-purple-50 border border-purple-100 rounded-2xl flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-purple-600 shadow-sm">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Next Post</p>
            <p className="text-sm font-bold text-purple-900">{content.nextPostDate}</p>
          </div>
        </div>
        <button 
          onClick={() => onAction?.("Opening Content Calendar...")}
          className="text-xs font-bold text-purple-600 hover:underline flex items-center gap-1"
        >
          View Calendar <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      <div className="space-y-3">
        <button 
          onClick={() => onAction?.("AI is thinking of new ideas...")}
          className="w-full btn-secondary justify-start py-4 border-dashed hover:border-purple-300 hover:text-purple-600"
        >
          <Lightbulb className="w-5 h-5 text-purple-500" />
          Generate Idea
        </button>
        <button 
          onClick={() => onAction?.("Crafting viral hook options...")}
          className="w-full btn-secondary justify-start py-4 border-dashed hover:border-blue-300 hover:text-blue-600"
        >
          <PenTool className="w-5 h-5 text-blue-500" />
          Write Hook
        </button>
        <button 
          onClick={() => onAction?.("Planning your content week...")}
          className="w-full btn-primary py-4 bg-purple-600 hover:bg-purple-500"
        >
          <Calendar className="w-5 h-5" />
          Plan Week
        </button>
      </div>
    </section>
  );
}
