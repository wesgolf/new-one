import React from 'react';
import { 
  AlertCircle, 
  TrendingDown, 
  TrendingUp, 
  Zap, 
  Clock, 
  CheckCircle2,
  MoreVertical,
  Info,
  ArrowRight
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Signal } from '../engine/growth';

export function AlertsPanel({ alerts = [], onAction }: { alerts?: Signal[], onAction?: (msg: string) => void }) {
  return (
    <section className="glass-card p-8 group hover:border-blue-200 transition-all">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <AlertCircle className="w-5 h-5 text-blue-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">Signals & Alerts</h3>
        </div>
        <button className="p-2 hover:bg-slate-50 rounded-lg transition-all text-slate-400 hover:text-slate-600">
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-4">
        {alerts.length > 0 ? (
          alerts.map((alert) => (
            <div 
              key={alert.id} 
              className={cn(
                "p-5 rounded-2xl border transition-all hover:shadow-md flex flex-col gap-4",
                alert.type === 'insight' && "bg-blue-50/50 border-blue-100",
                alert.type === 'warning' && "bg-rose-50/50 border-rose-100",
                alert.type === 'momentum' && "bg-emerald-50/50 border-emerald-100",
                alert.type === 'opportunity' && "bg-blue-50/50 border-blue-100"
              )}
            >
              <div className="flex items-start gap-4">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                  alert.type === 'insight' && "bg-blue-100 text-blue-600",
                  alert.type === 'warning' && "bg-rose-100 text-rose-600",
                  alert.type === 'momentum' && "bg-emerald-100 text-emerald-600",
                  alert.type === 'opportunity' && "bg-blue-100 text-blue-600"
                )}>
                  {alert.type === 'momentum' && <TrendingUp className="w-5 h-5" />}
                  {alert.type === 'warning' && <TrendingDown className="w-5 h-5" />}
                  {alert.type === 'insight' && <Zap className="w-5 h-5" />}
                  {alert.type === 'opportunity' && <Clock className="w-5 h-5" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className={cn(
                      "text-sm font-bold",
                      alert.type === 'insight' && "text-blue-900",
                      alert.type === 'warning' && "text-rose-900",
                      alert.type === 'momentum' && "text-emerald-900",
                      alert.type === 'opportunity' && "text-blue-900"
                    )}>{alert.title}</p>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Now</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{alert.description}</p>
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-2 border-t border-slate-100/50">
                <p className="text-[10px] font-bold text-slate-500 italic">Action: {alert.action}</p>
                <button 
                  onClick={() => onAction?.(`Signal action: ${alert.action}`)}
                  className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-widest"
                >
                  Execute
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="py-12 flex flex-col items-center justify-center text-center bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm mb-4">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
            <h4 className="text-sm font-bold text-slate-900">All Clear!</h4>
            <p className="text-xs text-slate-500 mt-1">No new signals to show.</p>
          </div>
        )}
      </div>

      {alerts.length > 0 && (
        <div className="mt-8 p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-3">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-slate-400 shadow-sm">
            <Info className="w-4 h-4" />
          </div>
          <p className="text-xs text-slate-500 font-medium italic">
            Signals are prioritized based on growth impact.
          </p>
        </div>
      )}
    </section>
  );
}
