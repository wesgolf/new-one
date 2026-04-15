import React, { useEffect, useMemo, useState } from 'react';
import { format, isPast, isToday, parseISO, subDays } from 'date-fns';
import { BarChart3, CheckSquare, RefreshCw, Sparkles, UploadCloud } from 'lucide-react';
import { fetchIdeas, fetchIntegrations, fetchReleases, fetchSyncJobs, fetchTasks } from '../lib/supabaseData';
import { useCurrentUser } from '../hooks/useCurrentUser';
import type { IdeaRecord, IntegrationAccount, ReleaseRecord, SyncJob, TaskRecord } from '../types/domain';

const LAST_LOGIN_KEY = 'artist_os_last_login';

function WeeklyReportModal({
  open,
  onClose,
  tasks,
  releases,
  syncJobs,
}: {
  open: boolean;
  onClose: () => void;
  tasks: TaskRecord[];
  releases: ReleaseRecord[];
  syncJobs: SyncJob[];
}) {
  if (!open) return null;

  const lastWeek = subDays(new Date(), 7);
  const completedTasks = tasks.filter((task) => task.completed_at && parseISO(task.completed_at) > lastWeek);
  const failedSyncs = syncJobs.filter((job) => job.status === 'failed');
  const reportSections = [
    { title: 'Best things this week', items: completedTasks.slice(0, 5).map((task) => task.title) },
    { title: 'Worst things this week', items: failedSyncs.slice(0, 5).map((job) => `${job.provider}: ${job.error_message || 'Unknown error'}`) },
    { title: 'Release highlights', items: releases.slice(0, 4).map((release) => `${release.title} • ${release.release_date || 'TBD'}`) },
    { title: 'Task summary', items: [`${completedTasks.length} completed`, `${tasks.filter((task) => task.status !== 'done').length} still open`] },
    { title: 'Action items', items: tasks.filter((task) => task.status !== 'done').slice(0, 5).map((task) => task.title) },
    { title: 'Sync issues or anomalies', items: failedSyncs.length ? failedSyncs.map((job) => `${job.provider}: ${job.error_message || 'Sync failed'}`) : ['No sync anomalies recorded this week.'] },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-[2rem] border border-border bg-white p-8 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">Weekly report</p>
            <h2 className="mt-2 text-3xl font-bold text-text-primary">Stakeholder summary</h2>
          </div>
          <div className="flex gap-3">
            <button type="button" className="btn-secondary" onClick={() => window.print()}>
              Export PDF
            </button>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {reportSections.map((section) => (
            <section key={section.title} className="rounded-[1.75rem] border border-border bg-slate-50 p-5">
              <h3 className="text-lg font-semibold text-text-primary">{section.title}</h3>
              <ul className="mt-4 space-y-2">
                {section.items.length === 0 ? (
                  <li className="text-sm text-text-secondary">No data available yet.</li>
                ) : (
                  section.items.map((item) => (
                    <li key={item} className="text-sm text-text-secondary">
                      {item}
                    </li>
                  ))
                )}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

export function CommandCenter() {
  const { authUser } = useCurrentUser();
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [ideas, setIdeas] = useState<IdeaRecord[]>([]);
  const [releases, setReleases] = useState<ReleaseRecord[]>([]);
  const [integrations, setIntegrations] = useState<IntegrationAccount[]>([]);
  const [syncJobs, setSyncJobs] = useState<SyncJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [taskRows, ideaRows, releaseRows, integrationRows, syncRows] = await Promise.all([
        fetchTasks(),
        fetchIdeas(),
        fetchReleases(),
        fetchIntegrations(),
        fetchSyncJobs(),
      ]);

      setTasks(taskRows);
      setIdeas(ideaRows);
      setReleases(releaseRows);
      setIntegrations(integrationRows);
      setSyncJobs(syncRows);
      localStorage.setItem(LAST_LOGIN_KEY, new Date().toISOString());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const lastLogin = localStorage.getItem(LAST_LOGIN_KEY);
  const lastLoginDate = lastLogin ? new Date(lastLogin) : null;

  const currentUserTasks = useMemo(() => {
    return tasks.filter((task) => task.assigned_to === authUser?.id || (!task.assigned_to && task.created_by === authUser?.id));
  }, [tasks, authUser?.id]);

  const overdueTasks = currentUserTasks.filter((task) => task.due_date && isPast(parseISO(task.due_date)) && !isToday(parseISO(task.due_date)) && task.status !== 'done');
  const dueTodayTasks = currentUserTasks.filter((task) => task.due_date && isToday(parseISO(task.due_date)) && task.status !== 'done');

  const sinceLastLogin = useMemo(() => {
    if (!lastLoginDate) return ideas.slice(0, 5);
    return ideas.filter((idea) => idea.created_at && new Date(idea.created_at) > lastLoginDate).slice(0, 6);
  }, [ideas, lastLoginDate]);

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      await fetch('/api/sync/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      await load();
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-text-tertiary">Command center</p>
          <h1 className="mt-2 text-4xl font-bold text-text-primary">Operational overview</h1>
          <p className="mt-2 max-w-2xl text-text-secondary">
            Manual provider runs have been centralized. Tasks, sync health, and weekly reporting now live in one control surface.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => setShowReport(true)} className="btn-secondary">
            <BarChart3 className="h-4 w-4" />
            Generate Report
          </button>
          <button type="button" onClick={handleSyncNow} className="btn-primary" disabled={syncing}>
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      </header>

      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-5">
          <div className="rounded-[2rem] border border-border bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">My tasks</p>
                <h2 className="mt-2 text-2xl font-bold text-text-primary">Due today and overdue</h2>
              </div>
              <span className="badge badge-primary">{currentUserTasks.length} assigned</span>
            </div>
            {loading ? (
              <p className="mt-4 text-sm text-text-secondary">Loading tasks...</p>
            ) : (
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-[1.75rem] bg-rose-50 p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-700">Overdue</p>
                  <ul className="mt-3 space-y-3">
                    {overdueTasks.length === 0 ? (
                      <li className="text-sm text-rose-700/80">No overdue tasks.</li>
                    ) : (
                      overdueTasks.map((task) => (
                        <li key={task.id} className="text-sm text-slate-900">
                          {task.title}
                          <span className="block text-xs text-text-secondary">
                            {task.due_date ? format(parseISO(task.due_date), 'MMM d, h:mm a') : 'No due date'}
                          </span>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
                <div className="rounded-[1.75rem] bg-amber-50 p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">Due today</p>
                  <ul className="mt-3 space-y-3">
                    {dueTodayTasks.length === 0 ? (
                      <li className="text-sm text-amber-700/80">Nothing due today.</li>
                    ) : (
                      dueTodayTasks.map((task) => (
                        <li key={task.id} className="text-sm text-slate-900">
                          {task.title}
                          <span className="block text-xs text-text-secondary">
                            {task.due_date ? format(parseISO(task.due_date), 'h:mm a') : 'No time set'}
                          </span>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-[2rem] border border-border bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-text-tertiary" />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">Since last login</p>
                <h2 className="mt-1 text-2xl font-bold text-text-primary">New ideas and creative updates</h2>
              </div>
            </div>
            <ul className="mt-5 space-y-3">
              {sinceLastLogin.length === 0 ? (
                <li className="text-sm text-text-secondary">No new ideas since your last session.</li>
              ) : (
                sinceLastLogin.map((idea) => (
                  <li key={idea.id} className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="font-semibold text-text-primary">{idea.title}</p>
                    <p className="mt-1 text-sm text-text-secondary">{idea.status}</p>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-[2rem] border border-border bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <UploadCloud className="h-4 w-4 text-text-tertiary" />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">Integrations</p>
                <h2 className="mt-1 text-2xl font-bold text-text-primary">Connection status</h2>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {integrations.length === 0 ? (
                <p className="text-sm text-text-secondary">No integration records yet. Sync jobs will populate them once the schema is applied.</p>
              ) : (
                integrations.map((integration) => (
                  <div key={integration.id} className="rounded-2xl border border-border px-4 py-3">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold capitalize text-text-primary">{integration.provider}</p>
                      <span className={`badge ${integration.connection_status === 'connected' ? 'badge-success' : integration.connection_status === 'error' ? 'badge-error' : 'badge-warning'}`}>
                        {integration.connection_status}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-text-secondary">
                      Last synced: {integration.last_synced_at ? format(parseISO(integration.last_synced_at), 'MMM d, h:mm a') : 'Never'}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-[2rem] border border-border bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-text-tertiary" />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">Recent sync outcomes</p>
                <h2 className="mt-1 text-2xl font-bold text-text-primary">Job log</h2>
              </div>
            </div>
            <ul className="mt-5 space-y-3">
              {syncJobs.length === 0 ? (
                <li className="text-sm text-text-secondary">No sync jobs recorded yet.</li>
              ) : (
                syncJobs.slice(0, 6).map((job) => (
                  <li key={job.id} className="rounded-2xl bg-slate-50 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold capitalize text-text-primary">{job.provider}</p>
                      <span className={`badge ${job.status === 'success' ? 'badge-success' : job.status === 'failed' ? 'badge-error' : 'badge-warning'}`}>
                        {job.status}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-text-secondary">
                      {job.completed_at ? format(parseISO(job.completed_at), 'MMM d, h:mm a') : 'In progress'}
                    </p>
                    {job.error_message && <p className="mt-1 text-xs text-error">{job.error_message}</p>}
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </section>

      <WeeklyReportModal open={showReport} onClose={() => setShowReport(false)} tasks={tasks} releases={releases} syncJobs={syncJobs} />
    </div>
  );
}
