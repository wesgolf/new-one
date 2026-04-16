import React, { useMemo } from 'react';
import { addDays, format, isWithinInterval, parseISO, startOfDay } from 'date-fns';
import { AlertTriangle, BarChart3, Calendar, Sparkles, TrendingDown, Zap } from 'lucide-react';

interface InsightEvent {
  date: string;
  type: string;
  time?: string;
}

interface Props {
  events: InsightEvent[];
  currentDate: Date;
}

export function CalendarInsightsPanel({ events, currentDate }: Props) {
  const insights = useMemo(() => {
    const today = startOfDay(new Date());
    const in14 = addDays(today, 14);

    const upcoming = events.filter((e) => {
      try {
        const d = parseISO(e.date);
        return isWithinInterval(d, { start: today, end: in14 });
      } catch {
        return false;
      }
    });

    // Per-day counts
    const perDay: Record<string, number> = {};
    upcoming.forEach((e) => { perDay[e.date] = (perDay[e.date] ?? 0) + 1; });

    // Busy days (3+ events)
    const busyDays = Object.entries(perDay)
      .filter(([, n]) => n >= 3)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(0, 3)
      .map(([d, n]) => `${format(parseISO(d), 'EEE d')} (${n})`);

    // Dead zones in next 7 days
    const deadZones: string[] = [];
    for (let i = 1; i <= 7; i++) {
      const d = addDays(today, i);
      const ds = format(d, 'yyyy-MM-dd');
      if (!perDay[ds]) deadZones.push(format(d, 'EEE MMM d'));
    }

    // Content density (scheduled posts in next 14d)
    const postCount = upcoming.filter((e) => e.type === 'post').length;

    // Conflicts: same date + time with multiple events
    const bySlot: Record<string, number> = {};
    upcoming.filter((e) => e.time).forEach((e) => {
      const slot = `${e.date}-${e.time}`;
      bySlot[slot] = (bySlot[slot] ?? 0) + 1;
    });
    const conflicts = Object.values(bySlot).filter((n) => n > 1).length;

    // Best opportunity: first dead zone
    const bestOpportunity = deadZones[0] ?? null;

    return { busyDays, deadZones, postCount, conflicts, bestOpportunity };
  }, [events, currentDate]);

  return (
    <aside className="space-y-4">
      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Schedule insights</h3>

      {/* Content density */}
      <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="rounded-xl bg-blue-50 p-2">
          <BarChart3 className="h-4 w-4 text-blue-600" />
        </div>
        <div>
          <p className="text-xs font-bold text-slate-800">Posts queued (14d)</p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {insights.postCount > 0
              ? `${insights.postCount} post${insights.postCount !== 1 ? 's' : ''} scheduled`
              : 'No posts scheduled in 2 weeks'}
          </p>
        </div>
      </div>

      {/* Best opportunity */}
      {insights.bestOpportunity && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
          <div className="rounded-xl bg-white p-2 shadow-sm">
            <Zap className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800">Open window</p>
            <p className="mt-0.5 text-[11px] text-slate-500">{insights.bestOpportunity} — nothing scheduled</p>
          </div>
        </div>
      )}

      {/* Busy days */}
      {insights.busyDays.length > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-orange-100 bg-orange-50 p-4">
          <div className="rounded-xl bg-white p-2 shadow-sm">
            <Calendar className="h-4 w-4 text-orange-500" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800">Busy days</p>
            <p className="mt-0.5 text-[11px] text-slate-500">{insights.busyDays.join(' · ')}</p>
          </div>
        </div>
      )}

      {/* Dead zones */}
      {insights.deadZones.length > 2 && (
        <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <div className="rounded-xl bg-white p-2 shadow-sm">
            <TrendingDown className="h-4 w-4 text-slate-500" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800">Dead zones</p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {insights.deadZones.slice(0, 3).join(', ')} — no events
            </p>
          </div>
        </div>
      )}

      {/* Conflicts */}
      {insights.conflicts > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-100 bg-rose-50 p-4">
          <div className="rounded-xl bg-white p-2 shadow-sm">
            <AlertTriangle className="h-4 w-4 text-rose-500" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800">Time conflicts</p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {insights.conflicts} slot{insights.conflicts > 1 ? 's' : ''} with overlapping events
            </p>
          </div>
        </div>
      )}

      {insights.postCount === 0 &&
        insights.busyDays.length === 0 &&
        insights.deadZones.length <= 2 &&
        insights.conflicts === 0 && (
          <div className="flex items-center gap-2 py-2 text-[11px] text-slate-400">
            <Sparkles className="h-3.5 w-3.5" />
            No issues detected this fortnight.
          </div>
        )}
    </aside>
  );
}
