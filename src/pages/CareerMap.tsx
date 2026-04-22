import React, { useState, useEffect, useMemo } from 'react';
import {
  Target,
  Flag,
  CheckCircle2,
  Clock,
  Zap,
  BarChart3,
  Calendar,
  Music,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

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
        supabase.from('shows').select('*').order('date', { ascending: true }),
      ]);
      setGoals(g.data || []);
      setReleases(r.data || []);
      setShows(s.data || []);
      setLoading(false);
    }
    fetchData();
  }, []);

  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => toDateStr(today), [today]);

  const milestones = useMemo(() => [
    ...releases.map(r => ({ date: r.release_date || r.distribution?.release_date, title: r.title, type: 'release' as const, icon: Music, color: 'bg-blue-500' })),
    ...shows.map(s => ({ date: s.date, title: s.venue || s.title || 'Show', type: 'show' as const, icon: Calendar, color: 'bg-indigo-500' })),
    ...goals.map(g => ({ date: g.deadline, title: g.title, type: 'goal' as const, icon: Target, color: 'bg-emerald-500' })),
  ].filter(m => m.date).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()), [goals, releases, shows]);

  // ── Computed: release cadence (past 90 days) ─────────────────────────────
  const ninetyDaysAgoStr = useMemo(() => {
    const d = new Date(today); d.setDate(today.getDate() - 90); return toDateStr(d);
  }, [today]);

  const recentReleases = useMemo(() =>
    releases.filter(r => {
      const d = r.release_date || r.distribution?.release_date;
      return d && d >= ninetyDaysAgoStr && d <= todayStr;
    }), [releases, ninetyDaysAgoStr, todayStr]);

  const upcomingReleases = useMemo(() => {
    const limit = new Date(today); limit.setDate(today.getDate() + 90);
    const limitStr = toDateStr(limit);
    return releases.filter(r => {
      const d = r.release_date || r.distribution?.release_date;
      return d && d > todayStr && d <= limitStr;
    });
  }, [releases, today, todayStr]);

  const upcomingShows = useMemo(() =>
    shows.filter(s => s.date && s.date >= todayStr), [shows, todayStr]);

  // ── Computed: goal health ────────────────────────────────────────────────
  const activeGoals = useMemo(() =>
    goals.filter(g => g.target > 0 && g.status_indicator !== 'completed' && g.status !== 'completed'),
    [goals]);

  const overallProgress = useMemo(() => {
    if (activeGoals.length === 0) return null;
    const sum = activeGoals.reduce((acc, g) => acc + Math.min((g.current / g.target) * 100, 100), 0);
    return Math.round(sum / activeGoals.length);
  }, [activeGoals]);

  const goalsOnTrack = useMemo(() =>
    activeGoals.filter(g => (g.current / g.target) >= 0.5 || g.status_indicator === 'on-track').length,
    [activeGoals]);

  // ── Computed: stale milestones from real data ────────────────────────────
  const staleMilestones = useMemo(() => [
    ...goals
      .filter(g => g.deadline && g.deadline < todayStr && g.status !== 'completed' && g.status_indicator !== 'completed')
      .map(g => ({ title: g.title, label: 'Overdue goal', color: 'rose' as const })),
    ...releases
      .filter(r => {
        const d = r.release_date || r.distribution?.release_date;
        return d && d < todayStr && r.status === 'scheduled';
      })
      .map(r => ({ title: r.title, label: 'Scheduled — unreleased', color: 'amber' as const })),
  ], [goals, releases, todayStr]);

  const cadenceLabel = recentReleases.length >= 2 ? 'High' : recentReleases.length === 1 ? 'Moderate' : 'Low';
  const cadenceColor = recentReleases.length >= 2 ? 'emerald' : recentReleases.length === 1 ? 'amber' : 'rose';

  return (
    <div className="space-y-10 pb-20">
      <header>
        <h2 className="text-3xl font-bold tracking-tight text-text-primary">Career Map</h2>
        <p className="text-text-secondary mt-2">Where you are vs. where you want to be. Strategy in motion.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Milestone Timeline + Goal Breakdown */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-8">
            <h3 className="text-lg font-bold mb-8 flex items-center gap-2">
              <Flag className="w-5 h-5 text-indigo-600" />
              Milestone Timeline
            </h3>

            {milestones.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/40 p-8 text-center">
                <p className="text-sm font-bold text-slate-500">No milestones yet</p>
                <p className="text-xs text-slate-400 mt-1">Add goals, releases, or shows to populate your timeline.</p>
              </div>
            ) : (
              <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                {milestones.map((m, i) => (
                  <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-50 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                      <m.icon className={cn('w-5 h-5', m.type === 'release' ? 'text-blue-600' : m.type === 'show' ? 'text-indigo-600' : 'text-emerald-600')} />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl border border-slate-100 bg-white shadow-sm group-hover:shadow-md transition-all">
                      <div className="flex items-center justify-between mb-1">
                        <time className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          {new Date(m.date).toLocaleDateString()}
                        </time>
                        <span className={cn('px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest text-white', m.color)}>
                          {m.type}
                        </span>
                      </div>
                      <div className="text-slate-900 font-bold">{m.title}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Goal Breakdown Engine */}
          <div className="glass-card p-8">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              Goal Breakdown Engine
            </h3>
            {activeGoals.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/40 p-8 text-center">
                <p className="text-sm font-bold text-slate-500">No active goals</p>
                <p className="text-xs text-slate-400 mt-1">Create goals in the Goals Tracker to see them here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {activeGoals.map((goal, i) => {
                  const pct = Math.min(Math.round((goal.current / goal.target) * 100), 100);
                  return (
                    <div key={i} className="p-6 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-slate-900 text-sm">{goal.title}</h4>
                        <span className={cn(
                          'text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest',
                          pct >= 80 ? 'text-emerald-600 bg-emerald-50' :
                          pct >= 40 ? 'text-amber-600 bg-amber-50' :
                          'text-rose-600 bg-rose-50',
                        )}>
                          {pct >= 80 ? 'On track' : pct >= 40 ? 'In progress' : 'Needs focus'}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-widest">
                          <span>Progress</span>
                          <span>{pct}%</span>
                        </div>
                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className={cn('h-full transition-all duration-1000', pct >= 80 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-rose-500')}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-slate-400">
                          {goal.current?.toLocaleString()} / {goal.target?.toLocaleString()} {goal.unit}
                        </p>
                      </div>
                      {goal.deadline && (
                        <div className="pt-3 border-t border-slate-200 flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span className="text-[10px] text-slate-400">
                            Deadline: {new Date(goal.deadline).toLocaleDateString()}
                          </span>
                          {goal.deadline < todayStr && (
                            <span className="text-[9px] font-bold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded ml-1">Overdue</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Career Map Sidebar — all computed from real data */}
        <div className="space-y-6">

          {/* Strategy Snapshot (replaces fake "AI Career Projection") */}
          <div className="glass-card p-6 bg-indigo-600 text-white border-none shadow-lg shadow-indigo-200">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Strategy Snapshot
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-white/10 rounded-xl border border-white/10">
                <span className="text-xs text-indigo-200">Release cadence (90 days)</span>
                <span className={cn(
                  'text-[10px] font-bold px-2 py-0.5 rounded-full',
                  recentReleases.length >= 2 ? 'bg-emerald-400/20 text-emerald-200' :
                  recentReleases.length === 1 ? 'bg-amber-400/20 text-amber-200' :
                  'bg-rose-400/20 text-rose-200',
                )}>
                  {cadenceLabel} — {recentReleases.length} release{recentReleases.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white/10 rounded-xl border border-white/10">
                <span className="text-xs text-indigo-200">Active goals</span>
                <span className="text-[10px] font-bold text-white">
                  {goalsOnTrack} / {activeGoals.length} on track
                  {overallProgress !== null ? ` · ${overallProgress}% avg` : ''}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white/10 rounded-xl border border-white/10">
                <span className="text-xs text-indigo-200">Upcoming (90 days)</span>
                <span className="text-[10px] font-bold text-white">
                  {upcomingReleases.length} release{upcomingReleases.length !== 1 ? 's' : ''}, {upcomingShows.length} show{upcomingShows.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
            <div className="mt-4 flex items-start gap-2 p-3 bg-white/5 rounded-xl border border-white/10">
              <Info className="w-3.5 h-3.5 text-indigo-300 mt-0.5 shrink-0" />
              <p className="text-[10px] text-indigo-300 leading-relaxed">
                Streaming growth projections require a connected analytics provider (Spotify, Songstats, or Soundcharts).
              </p>
            </div>
          </div>

          {/* Velocity Indicators — real computed metrics only */}
          <div className="glass-card p-6">
            <h3 className="text-sm font-bold mb-4 text-text-primary flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-500" />
              Velocity Indicators
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-text-secondary">Release pace</span>
                <span className={cn('text-xs font-bold', cadenceColor === 'emerald' ? 'text-emerald-600' : cadenceColor === 'amber' ? 'text-amber-500' : 'text-rose-500')}>
                  {cadenceLabel}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-text-secondary">Goal completion</span>
                <span className={cn('text-xs font-bold', activeGoals.length === 0 ? 'text-slate-400' : goalsOnTrack === activeGoals.length ? 'text-emerald-600' : 'text-amber-500')}>
                  {activeGoals.length === 0 ? 'No goals set' : `${overallProgress}% avg progress`}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-text-secondary">Streaming growth</span>
                <span className="text-xs font-bold text-slate-400">No provider connected</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-text-secondary">Social reach</span>
                <span className="text-xs font-bold text-slate-400">No provider connected</span>
              </div>
            </div>
            <div className="mt-4 flex items-start gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <Info className="w-3 h-3 text-slate-400 mt-0.5 shrink-0" />
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Connect Spotify, Songstats, or Soundcharts in your environment settings to unlock growth velocity metrics.
              </p>
            </div>
          </div>

          {/* Stale Milestones — computed from real goals / releases */}
          <div className="glass-card p-6">
            <h3 className="text-sm font-bold mb-4 text-text-primary flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />
              Needs Attention
            </h3>
            {staleMilestones.length === 0 ? (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <p className="text-xs font-bold text-emerald-700">Everything is on schedule</p>
              </div>
            ) : (
              <div className="space-y-3">
                {staleMilestones.map((m, i) => (
                  <div key={i} className={cn(
                    'p-3 rounded-xl border flex items-start gap-2',
                    m.color === 'rose' ? 'bg-rose-50 border-rose-100' : 'bg-amber-50 border-amber-100',
                  )}>
                    <AlertTriangle className={cn('w-3.5 h-3.5 mt-0.5 shrink-0', m.color === 'rose' ? 'text-rose-500' : 'text-amber-500')} />
                    <div>
                      <p className={cn('text-[10px] font-bold uppercase tracking-widest mb-0.5', m.color === 'rose' ? 'text-rose-600' : 'text-amber-600')}>
                        {m.label}
                      </p>
                      <p className="text-xs font-bold text-slate-900">{m.title}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
