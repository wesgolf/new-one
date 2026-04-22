import React from 'react';
import { 
  Eye, 
  MousePointer2, 
  Play, 
  Heart, 
  TrendingUp, 
  Users
} from 'lucide-react';
import { cn } from '../lib/utils';

interface FunnelData {
  views: number;
  profileClicks: number;
  streams: number;
  saves: number;
}

export function FanFunnel({ data }: { data: FunnelData | null }) {
  const steps = [
    { label: 'Views', value: data?.views || 0, icon: Eye, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Profile Clicks', value: data?.profileClicks || 0, icon: MousePointer2, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Streams', value: data?.streams || 0, icon: Play, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Saves', value: data?.saves || 0, icon: Heart, color: 'text-rose-600', bg: 'bg-rose-50' },
  ];

  const biggestDropOffIndex = steps.reduce((prev, curr, i, arr) => {
    if (i === 0) return 0;
    const prevStep = arr[i - 1];
    const dropOff = prevStep.value > 0 ? curr.value / prevStep.value : 0;
    const prevDropOff = i > 1 ? arr[i - 1].value / arr[i - 2].value : 1;
    return dropOff < prevDropOff ? i : prev;
  }, 0);

  return (
    <section className="glass-card p-8 group hover:border-blue-200 transition-all">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">Fan Funnel</h3>
        </div>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Last 7 Days</span>
      </div>

      {data ? (
        <div className="flex flex-col gap-6">
          {steps.map((step, i) => {
            const nextStep = steps[i + 1];
            const conversion = nextStep && step.value > 0 ? (nextStep.value / step.value) * 100 : null;
            
            return (
              <div key={step.label} className="relative">
                <div className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100 group-hover:bg-white transition-all">
                  <div className="flex items-center gap-4">
                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm", step.bg, step.color)}>
                      <step.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{step.label}</p>
                      <p className="text-2xl font-bold text-slate-900">{step.value.toLocaleString()}</p>
                    </div>
                  </div>
                  {conversion !== null && (
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Conversion</p>
                      <p className={cn(
                        "text-sm font-bold",
                        conversion > 5 ? "text-emerald-600" : "text-rose-600"
                      )}>{conversion.toFixed(1)}%</p>
                    </div>
                  )}
                </div>
                
                {conversion !== null && (
                  <div className="flex justify-center py-2">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-0.5 h-4 bg-slate-100" />
                      <div className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                        conversion < 5 ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-slate-50 text-slate-400 border-slate-100"
                      )}>
                        {conversion < 5 ? "High Drop-off" : "Healthy Flow"}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          <div className="mt-8 p-4 bg-blue-50 border border-blue-100 rounded-2xl">
            <p className="text-sm text-blue-700 font-medium">
              <span className="font-bold">Insight:</span> Your biggest drop-off is between <span className="font-bold">{steps[biggestDropOffIndex - 1]?.label}</span> and <span className="font-bold">{steps[biggestDropOffIndex]?.label}</span>. Optimize your call-to-action or landing page.
            </p>
          </div>
        </div>
      ) : (
        <div className="py-12 flex flex-col items-center justify-center text-center bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4">
            <Users className="w-8 h-8 text-slate-300" />
          </div>
          <h4 className="text-lg font-bold text-slate-900">No Funnel Data</h4>
          <p className="text-sm text-slate-500 max-w-[240px] mt-2">
            Connect your social and streaming accounts to visualize your fan journey.
          </p>
        </div>
      )}
    </section>
  );
}
