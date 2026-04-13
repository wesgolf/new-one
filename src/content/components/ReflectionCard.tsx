import React from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  Zap, 
  Target, 
  MessageSquare,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { ContentItem, ContentReflection } from '../types';
import { cn } from '../../lib/utils';
import { motion } from 'framer-motion';

interface ReflectionCardProps {
  reflection: ContentReflection;
  item: ContentItem;
}

export const ReflectionCard: React.FC<ReflectionCardProps> = ({
  reflection,
  item
}) => {
  const isHigh = reflection.verdict === 'high_performer';
  const isLow = reflection.verdict === 'underperformer';

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "glass-card p-8 border-2 relative overflow-hidden group",
        isHigh ? "border-emerald-500/30 bg-emerald-50/20" : 
        isLow ? "border-rose-500/30 bg-rose-50/20" : 
        "border-blue-500/30 bg-blue-50/20"
      )}
    >
      {/* Background Icon Accent */}
      <div className="absolute -top-10 -right-10 opacity-5 group-hover:scale-110 transition-transform duration-700">
        {isHigh ? <TrendingUp className="w-48 h-48 text-emerald-500" /> : 
         isLow ? <TrendingDown className="w-48 h-48 text-rose-500" /> : 
         <Zap className="w-48 h-48 text-blue-500" />}
      </div>

      <div className="relative z-10 space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center shadow-sm",
              isHigh ? "bg-emerald-500 text-white" : 
              isLow ? "bg-rose-500 text-white" : 
              "bg-blue-500 text-white"
            )}>
              {isHigh ? <TrendingUp className="w-5 h-5" /> : 
               isLow ? <TrendingDown className="w-5 h-5" /> : 
               <Zap className="w-5 h-5" />}
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Performance Verdict</p>
              <h4 className={cn(
                "text-lg font-black uppercase tracking-tight",
                isHigh ? "text-emerald-600" : 
                isLow ? "text-rose-600" : 
                "text-blue-600"
              )}>
                {reflection.verdict.replace('_', ' ')}
              </h4>
            </div>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {new Date(reflection.generated_at).toLocaleDateString()}
          </p>
        </div>

        <div className="space-y-6">
          <p className="text-xl font-black text-slate-900 italic leading-tight">
            "{reflection.summary}"
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h5 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Why It Worked
              </h5>
              <ul className="space-y-3">
                {reflection.why_it_worked.map((point, i) => (
                  <li key={i} className="text-sm font-bold text-slate-600 flex items-start gap-2 leading-relaxed">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full mt-1.5 shrink-0" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-4">
              <h5 className="text-[10px] font-black text-rose-600 uppercase tracking-widest flex items-center gap-2">
                <XCircle className="w-3.5 h-3.5" />
                Why It Didn't
              </h5>
              <ul className="space-y-3">
                {reflection.why_it_didnt.map((point, i) => (
                  <li key={i} className="text-sm font-bold text-slate-600 flex items-start gap-2 leading-relaxed">
                    <span className="w-1.5 h-1.5 bg-rose-400 rounded-full mt-1.5 shrink-0" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-200/50">
          <div className="p-6 bg-slate-900 rounded-[2rem] shadow-xl shadow-slate-900/20 group/exp cursor-pointer hover:scale-[1.02] transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-blue-400">
                <Target className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Next Experiment</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-600 group-hover/exp:translate-x-1 group-hover/exp:text-blue-400 transition-all" />
            </div>
            <p className="text-sm font-bold text-white leading-relaxed">
              {reflection.next_experiment}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
