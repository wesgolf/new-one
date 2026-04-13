import React, { useState, useEffect } from 'react';
import { 
  Map, 
  Target, 
  Flag, 
  TrendingUp, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  Zap,
  Sparkles,
  ChevronRight,
  BarChart3,
  Calendar,
  Music
} from 'lucide-react';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';

export function CareerMap() {
  const [goals, setGoals] = useState<any[]>([]);
  const [releases, setReleases] = useState<any[]>([]);
  const [shows, setShows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const [g, r, s] = await Promise.all([
        supabase.from('goals').select('*').order('deadline', { ascending: true }),
        supabase.from('releases').select('*').order('release_date', { ascending: true }),
        supabase.from('shows').select('*').order('date', { ascending: true })
      ]);
      setGoals(g.data || []);
      setReleases(r.data || []);
      setShows(s.data || []);
      setLoading(false);
    }
    fetchData();
  }, []);

  const milestones = [
    ...releases.map(r => ({ date: r.release_date || r.distribution?.release_date, title: r.title, type: 'release', icon: Music, color: 'bg-blue-500' })),
    ...shows.map(s => ({ date: s.date, title: s.venue, type: 'show', icon: Calendar, color: 'bg-purple-500' })),
    ...goals.map(g => ({ date: g.deadline, title: g.title, type: 'goal', icon: Target, color: 'bg-emerald-500' }))
  ].filter(m => m.date).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="space-y-10 pb-20">
      <header>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">Career Map</h2>
        <p className="text-slate-500 mt-2">Where you are vs. where you want to be. Strategy in motion.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Milestone Timeline */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-8">
            <h3 className="text-lg font-bold mb-8 flex items-center gap-2">
              <Flag className="w-5 h-5 text-indigo-600" />
              Milestone Timeline
            </h3>
            
            <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
              {milestones.map((m, i) => (
                <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-50 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                    <m.icon className={cn("w-5 h-5", m.type === 'release' ? 'text-blue-600' : m.type === 'show' ? 'text-purple-600' : 'text-emerald-600')} />
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl border border-slate-100 bg-white shadow-sm group-hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-1">
                      <time className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date(m.date).toLocaleDateString()}</time>
                      <span className={cn("px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest text-white", m.color)}>{m.type}</span>
                    </div>
                    <div className="text-slate-900 font-bold">{m.title}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Goal Breakdown Engine */}
          <div className="glass-card p-8">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              Goal Breakdown Engine
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {goals.filter(g => g.status_indicator !== 'off-track').map((goal, i) => (
                <div key={i} className="p-6 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900">{goal.title}</h4>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded uppercase tracking-widest">Active</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-widest">
                      <span>Progress</span>
                      <span>{Math.round((goal.current / goal.target) * 100)}%</span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-600 transition-all duration-1000" 
                        style={{ width: `${(goal.current / goal.target) * 100}%` }} 
                      />
                    </div>
                  </div>
                  <div className="pt-4 border-t border-slate-200">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Required Actions</p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span>{Math.ceil((goal.target - goal.current) / 1000)}x Content Posts</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span>{Math.ceil((goal.target - goal.current) / 5000)}x Major Releases</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Career Map Sidebar */}
        <div className="space-y-8">
          <div className="glass-card p-6 bg-indigo-600 text-white border-none shadow-lg shadow-indigo-200">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              AI Career Projection
            </h3>
            <p className="text-sm text-indigo-100 leading-relaxed mb-6">
              Based on your current release frequency and engagement growth, you are projected to hit <span className="text-white font-bold">500K Monthly Listeners</span> by October 2026.
            </p>
            <div className="p-4 bg-white/10 rounded-xl border border-white/20">
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2">Next Big Move</p>
              <p className="text-sm font-bold">Secure a "Warm" Label Opportunity</p>
            </div>
          </div>

          <div className="glass-card p-6">
            <h3 className="text-sm font-bold mb-4 text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-500" />
              Growth Velocity
            </h3>
            <div className="space-y-4">
              {[
                { label: 'Streaming', value: '+12.4%', status: 'up' },
                { label: 'Social Reach', value: '+8.2%', status: 'up' },
                { label: 'Live Revenue', value: '-2.1%', status: 'down' },
              ].map((stat, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">{stat.label}</span>
                  <span className={cn("text-xs font-bold", stat.status === 'up' ? 'text-emerald-600' : 'text-rose-600')}>
                    {stat.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-6">
            <h3 className="text-sm font-bold mb-4 text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-500" />
              Stale Milestones
            </h3>
            <div className="space-y-3">
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-100">
                <p className="text-[10px] font-bold text-rose-600 uppercase tracking-widest mb-1">Delayed</p>
                <p className="text-xs font-bold text-slate-900">Summer Tour Announcement</p>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1">Stale</p>
                <p className="text-xs font-bold text-slate-900">Merch Store Launch</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
