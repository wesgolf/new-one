import React, { useEffect, useMemo, useState } from 'react';
import { format, isPast, isToday, parseISO } from 'date-fns';
import { CheckCircle2, Circle, Filter, Plus, Search, User2 } from 'lucide-react';
import { fetchTasks, safeProfiles, saveTask } from '../lib/supabaseData';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { subscribeAssistantActions } from '../lib/commandBus';
import type { ProfileSummary, TaskPriority, TaskRecord, TaskStatus } from '../types/domain';

const STATUS_OPTIONS: TaskStatus[] = ['todo', 'in_progress', 'blocked', 'done'];
const PRIORITY_OPTIONS: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];

interface TaskModalProps {
  open: boolean;
  profiles: ProfileSummary[];
  initialTask: Partial<TaskRecord> | null;
  onClose: () => void;
  onSaved: () => void;
}

function TaskModal({ open, profiles, initialTask, onClose, onSaved }: TaskModalProps) {
  const [form, setForm] = useState<Partial<TaskRecord>>({
    status: 'todo',
    priority: 'medium',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(
        initialTask || {
          status: 'todo',
          priority: 'medium',
        }
      );
    }
  }, [open, initialTask]);

  if (!open) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await saveTask(form);
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-[2rem] border border-border bg-white p-6 shadow-2xl">
        <div className="mb-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">Tasks</p>
          <h3 className="mt-2 text-2xl font-bold text-text-primary">
            {form.id ? 'Edit task' : 'Create task'}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">Title</span>
            <input
              required
              value={form.title || ''}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              className="input-base"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">Description</span>
            <textarea
              value={form.description || ''}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              className="min-h-28 w-full rounded-2xl border border-border bg-slate-50 px-4 py-3 text-sm text-text-primary outline-none"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">Status</span>
              <select
                value={form.status || 'todo'}
                onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as TaskStatus }))}
                className="input-base"
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">Priority</span>
              <select
                value={form.priority || 'medium'}
                onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value as TaskPriority }))}
                className="input-base"
              >
                {PRIORITY_OPTIONS.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">Due date</span>
              <input
                type="datetime-local"
                value={form.due_date ? form.due_date.slice(0, 16) : ''}
                onChange={(event) => setForm((current) => ({ ...current, due_date: event.target.value ? new Date(event.target.value).toISOString() : null }))}
                className="input-base"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">Assign to</span>
            <select
              value={form.assigned_to || ''}
              onChange={(event) => setForm((current) => ({ ...current, assigned_to: event.target.value || null }))}
              className="input-base"
            >
              <option value="">Unassigned</option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.full_name || profile.email || profile.id}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function Tasks() {
  const { authUser } = useCurrentUser();
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [profiles, setProfiles] = useState<ProfileSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [dueFilter, setDueFilter] = useState<'all' | 'overdue' | 'today' | 'upcoming'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Partial<TaskRecord> | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [taskRows, profileRows] = await Promise.all([fetchTasks(), safeProfiles()]);
      setTasks(taskRows);
      setProfiles(profileRows);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    return subscribeAssistantActions((action) => {
      if (action.type === 'create_task') {
        setSelectedTask({
          title: action.payload?.title || '',
          due_date: action.payload?.startsAt || null,
          status: 'todo',
          priority: 'medium',
        });
        setModalOpen(true);
      }
    });
  }, []);

  const profileMap = useMemo(
    () =>
      profiles.reduce<Record<string, ProfileSummary>>((acc, profile) => {
        acc[profile.id] = profile;
        return acc;
      }, {}),
    [profiles]
  );

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch =
        task.title.toLowerCase().includes(search.toLowerCase()) ||
        (task.description || '').toLowerCase().includes(search.toLowerCase());
      const matchesAssignee = assigneeFilter === 'all' || task.assigned_to === assigneeFilter;
      const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;

      let matchesDue = true;
      if (task.due_date && dueFilter !== 'all') {
        const dueDate = parseISO(task.due_date);
        if (dueFilter === 'overdue') matchesDue = isPast(dueDate) && !isToday(dueDate);
        if (dueFilter === 'today') matchesDue = isToday(dueDate);
        if (dueFilter === 'upcoming') matchesDue = !isPast(dueDate) && !isToday(dueDate);
      } else if (dueFilter !== 'all') {
        matchesDue = false;
      }

      return matchesSearch && matchesAssignee && matchesStatus && matchesPriority && matchesDue;
    });
  }, [tasks, search, assigneeFilter, statusFilter, priorityFilter, dueFilter]);

  const quickUpdateStatus = async (task: TaskRecord, status: TaskStatus) => {
    await saveTask({
      ...task,
      status,
      completed_at: status === 'done' ? new Date().toISOString() : null,
    });
    load();
  };

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-text-tertiary">Operations</p>
          <h1 className="mt-2 text-4xl font-bold text-text-primary">Tasks</h1>
          <p className="mt-2 max-w-2xl text-text-secondary">
            Track assignments for the artist and manager, keep dashboard views personal, and keep tasks calendar-ready.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setSelectedTask({
              assigned_to: authUser?.id || null,
              status: 'todo',
              priority: 'medium',
            });
            setModalOpen(true);
          }}
          className="btn-primary"
        >
          <Plus className="h-4 w-4" />
          New Task
        </button>
      </header>

      <section className="grid gap-4 rounded-[2rem] border border-border bg-white p-5 shadow-sm lg:grid-cols-[1.2fr_repeat(4,minmax(0,1fr))]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search tasks"
            className="input-base pl-10"
          />
        </label>
        <select className="input-base" value={assigneeFilter} onChange={(event) => setAssigneeFilter(event.target.value)}>
          <option value="all">All assignees</option>
          {profiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.full_name || profile.email || profile.id}
            </option>
          ))}
        </select>
        <select className="input-base" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="all">All statuses</option>
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {status.replace('_', ' ')}
            </option>
          ))}
        </select>
        <select className="input-base" value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}>
          <option value="all">All priorities</option>
          {PRIORITY_OPTIONS.map((priority) => (
            <option key={priority} value={priority}>
              {priority}
            </option>
          ))}
        </select>
        <select className="input-base" value={dueFilter} onChange={(event) => setDueFilter(event.target.value as any)}>
          <option value="all">All due dates</option>
          <option value="overdue">Overdue</option>
          <option value="today">Due today</option>
          <option value="upcoming">Upcoming</option>
        </select>
      </section>

      <section className="rounded-[2rem] border border-border bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-text-tertiary" />
            <span className="text-sm font-semibold text-text-primary">{filteredTasks.length} visible tasks</span>
          </div>
          <p className="text-xs text-text-tertiary">Dashboard keeps showing only the current user’s assignments.</p>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-text-secondary">Loading tasks...</div>
        ) : filteredTasks.length === 0 ? (
          <div className="p-10 text-center">
            <Circle className="mx-auto h-10 w-10 text-border" />
            <p className="mt-3 text-sm text-text-secondary">No tasks match these filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">
                  <th className="px-6 py-4">Task</th>
                  <th className="px-6 py-4">Assignee</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Priority</th>
                  <th className="px-6 py-4">Due</th>
                  <th className="px-6 py-4">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredTasks.map((task) => {
                  const assignee = task.assigned_to ? profileMap[task.assigned_to] : null;
                  return (
                    <tr key={task.id} className="align-top">
                      <td className="px-6 py-5">
                        <button
                          type="button"
                          className="text-left"
                          onClick={() => {
                            setSelectedTask(task);
                            setModalOpen(true);
                          }}
                        >
                          <div className="font-semibold text-text-primary">{task.title}</div>
                          {task.description && <p className="mt-1 text-sm text-text-secondary">{task.description}</p>}
                        </button>
                      </td>
                      <td className="px-6 py-5 text-sm text-text-secondary">
                        <div className="inline-flex items-center gap-2">
                          <User2 className="h-4 w-4 text-text-tertiary" />
                          {assignee?.full_name || assignee?.email || 'Unassigned'}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="badge badge-primary">{task.status.replace('_', ' ')}</span>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`badge ${task.priority === 'urgent' ? 'badge-error' : task.priority === 'high' ? 'badge-warning' : 'badge-primary'}`}>
                          {task.priority}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-sm text-text-secondary">
                        {task.due_date ? format(parseISO(task.due_date), 'MMM d, h:mm a') : 'No due date'}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-wrap gap-2">
                          {STATUS_OPTIONS.map((status) => (
                            <button
                              key={status}
                              type="button"
                              onClick={() => quickUpdateStatus(task, status)}
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${task.status === status ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-700'}`}
                            >
                              {status === 'done' ? <CheckCircle2 className="mr-1 inline h-3 w-3" /> : null}
                              {status.replace('_', ' ')}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <TaskModal
        open={modalOpen}
        profiles={profiles}
        initialTask={selectedTask}
        onClose={() => setModalOpen(false)}
        onSaved={load}
      />
    </div>
  );
}
