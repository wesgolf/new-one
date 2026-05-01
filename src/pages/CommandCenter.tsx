import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckSquare, FileText, Lightbulb, Plug2, Target } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useCurrentUserRole } from '../hooks/useCurrentUserRole';
import { useCurrentUser } from '../hooks/useCurrentUser';

type DashboardSnapshot = {
  tasks: any[];
  goals: any[];
  ideas: any[];
  calendarEvents: any[];
  reports: any[];
  integrations: any[];
};

const EMPTY_DATA: DashboardSnapshot = {
  tasks: [],
  goals: [],
  ideas: [],
  calendarEvents: [],
  reports: [],
  integrations: [],
};

function StatCard({
  label,
  value,
  detail,
  Icon,
}: {
  label: string;
  value: string | number;
  detail: string;
  Icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">{label}</p>
          <p className="mt-2 text-3xl font-bold text-text-primary">{value}</p>
          <p className="mt-2 text-sm text-text-secondary">{detail}</p>
        </div>
        <div className="rounded-xl bg-slate-100 p-2.5 text-slate-700">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <h2 className="text-base font-semibold text-text-primary">{title}</h2>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function CommandCenter() {
  const { isManager, roleDisplayName } = useCurrentUserRole();
  const { authUser, isLoading: authLoading } = useCurrentUser();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardSnapshot>(EMPTY_DATA);

  const load = useCallback(async () => {
    if (authLoading) return;
    setLoading(true);
    setError(null);

    try {
      const userId = authUser?.id;
      if (!userId) {
        setData(EMPTY_DATA);
        return;
      }

      const [tasksRes, goalsRes, ideasRes, eventsRes, reportsRes, integrationsRes] = await Promise.all([
        supabase
          .from('tasks')
          .select('*')
          .or(`user_id_assigned_by.eq.${userId},user_id_assigned_to.eq.${userId}`)
          .order('due_date', { ascending: true }),
        supabase.from('goals').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('ideas').select('*').eq('user_id', userId).order('updated_at', { ascending: false }),
        supabase.from('calendar_events').select('*').eq('user_id', userId).order('starts_at', { ascending: true }),
        supabase.from('reports').select('*').eq('user_id', userId).order('report_date', { ascending: false }),
        supabase.from('integrations').select('*').eq('user_id', userId).order('updated_at', { ascending: false }),
      ]);

      const firstError =
        tasksRes.error ||
        goalsRes.error ||
        ideasRes.error ||
        eventsRes.error ||
        reportsRes.error ||
        integrationsRes.error;

      if (firstError) throw firstError;

      setData({
        tasks: tasksRes.data ?? [],
        goals: goalsRes.data ?? [],
        ideas: ideasRes.data ?? [],
        calendarEvents: eventsRes.data ?? [],
        reports: reportsRes.data ?? [],
        integrations: integrationsRes.data ?? [],
      });
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [authLoading, authUser?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const snapshot = useMemo(() => {
    const pendingTasks = data.tasks.filter((task) => task.completed !== 'completed').length;
    const healthyIntegrations = data.integrations.filter((integration) => integration.status === 'healthy').length;
    const upcomingEvents = data.calendarEvents.filter((event) => {
      if (!event.starts_at) return false;
      return new Date(event.starts_at).getTime() >= Date.now();
    }).length;
    const activeGoals = data.goals.filter((goal) => goal.is_timeless || !goal.due_by || new Date(goal.due_by).getTime() >= Date.now()).length;

    return {
      pendingTasks,
      healthyIntegrations,
      upcomingEvents,
      activeGoals,
    };
  }, [data]);

  const upcomingEvents = useMemo(
    () =>
      [...data.calendarEvents]
        .filter((event) => event.starts_at)
        .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
        .slice(0, 5),
    [data.calendarEvents],
  );

  const recentIdeas = useMemo(() => data.ideas.slice(0, 5), [data.ideas]);
  const recentReports = useMemo(() => data.reports.slice(0, 4), [data.reports]);

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-text-tertiary">Dashboard</p>
          <h1 className="mt-2 text-4xl font-bold text-text-primary">Command Center</h1>
          <p className="mt-2 max-w-2xl text-text-secondary">
            {roleDisplayName ? `${roleDisplayName} workspace` : 'Workspace'} snapshot across tasks, goals, ideas, calendar, reports, and integrations.
          </p>
        </div>
        <button type="button" onClick={() => void load()} className="btn-secondary">
          Refresh
        </button>
      </header>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pending Tasks" value={snapshot.pendingTasks} detail="Open work items assigned or created by you." Icon={CheckSquare} />
        <StatCard label="Active Goals" value={snapshot.activeGoals} detail="Goals still in play in this schema phase." Icon={Target} />
        <StatCard label="Upcoming Events" value={snapshot.upcomingEvents} detail="Calendar events scheduled from now forward." Icon={CalendarDays} />
        <StatCard label="Healthy APIs" value={`${snapshot.healthyIntegrations}/${data.integrations.length || 0}`} detail="Integration rows currently marked healthy." Icon={Plug2} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <SectionCard
          title="Upcoming Calendar Events"
          action={<NavLink to="/calendar" className="text-sm font-semibold text-brand hover:underline">Open calendar</NavLink>}
        >
          {loading ? (
            <p className="text-sm text-text-secondary">Loading events…</p>
          ) : upcomingEvents.length === 0 ? (
            <p className="text-sm text-text-secondary">No calendar events yet.</p>
          ) : (
            <div className="space-y-3">
              {upcomingEvents.map((event) => (
                <div key={event.id} className="rounded-xl border border-border bg-slate-50 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-text-primary">{event.title}</p>
                      <p className="mt-1 text-sm text-text-secondary">
                        {event.event_type} · {new Date(event.starts_at).toLocaleString()}
                      </p>
                    </div>
                    {event.source_table && (
                      <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">
                        {event.source_table}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Recent Ideas"
          action={<NavLink to="/ideas" className="text-sm font-semibold text-brand hover:underline">Open ideas</NavLink>}
        >
          {loading ? (
            <p className="text-sm text-text-secondary">Loading ideas…</p>
          ) : recentIdeas.length === 0 ? (
            <p className="text-sm text-text-secondary">No ideas captured yet.</p>
          ) : (
            <div className="space-y-3">
              {recentIdeas.map((idea) => (
                <div key={idea.id} className="rounded-xl border border-border bg-slate-50 px-4 py-3">
                  <p className="font-medium text-text-primary">{idea.title}</p>
                  <p className="mt-1 text-sm text-text-secondary">
                    {idea.status} {idea.bpm ? `· ${idea.bpm} BPM` : ''} {idea.musical_key ? `· ${idea.musical_key}` : ''}
                  </p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <SectionCard
          title="Reports"
          action={<NavLink to="/reports" className="text-sm font-semibold text-brand hover:underline">Open reports</NavLink>}
        >
          {loading ? (
            <p className="text-sm text-text-secondary">Loading reports…</p>
          ) : recentReports.length === 0 ? (
            <p className="text-sm text-text-secondary">No reports saved yet.</p>
          ) : (
            <div className="space-y-3">
              {recentReports.map((report) => (
                <div key={report.id} className="rounded-xl border border-border bg-slate-50 px-4 py-3">
                  <p className="font-medium text-text-primary">{report.title}</p>
                  <p className="mt-1 text-sm text-text-secondary">
                    {new Date(report.report_date).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Quick Access"
          action={isManager ? <span className="text-xs text-text-tertiary">Manager workflow</span> : <span className="text-xs text-text-tertiary">Artist workflow</span>}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <NavLink to="/tasks" className="rounded-xl border border-border bg-slate-50 px-4 py-4 transition-colors hover:border-brand/30 hover:bg-white">
              <div className="flex items-center gap-3">
                <CheckSquare className="h-4 w-4 text-text-secondary" />
                <span className="font-medium text-text-primary">Tasks</span>
              </div>
            </NavLink>
            <NavLink to="/goals" className="rounded-xl border border-border bg-slate-50 px-4 py-4 transition-colors hover:border-brand/30 hover:bg-white">
              <div className="flex items-center gap-3">
                <Target className="h-4 w-4 text-text-secondary" />
                <span className="font-medium text-text-primary">Goals</span>
              </div>
            </NavLink>
            <NavLink to="/calendar" className="rounded-xl border border-border bg-slate-50 px-4 py-4 transition-colors hover:border-brand/30 hover:bg-white">
              <div className="flex items-center gap-3">
                <CalendarDays className="h-4 w-4 text-text-secondary" />
                <span className="font-medium text-text-primary">Calendar</span>
              </div>
            </NavLink>
            <NavLink to="/coach" className="rounded-xl border border-border bg-slate-50 px-4 py-4 transition-colors hover:border-brand/30 hover:bg-white">
              <div className="flex items-center gap-3">
                <Lightbulb className="h-4 w-4 text-text-secondary" />
                <span className="font-medium text-text-primary">Coach</span>
              </div>
            </NavLink>
            <NavLink to="/reports" className="rounded-xl border border-border bg-slate-50 px-4 py-4 transition-colors hover:border-brand/30 hover:bg-white sm:col-span-2">
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-text-secondary" />
                <span className="font-medium text-text-primary">Reports</span>
              </div>
            </NavLink>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
