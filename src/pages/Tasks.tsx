import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { format, isPast, isToday, parseISO } from 'date-fns';
import { AlertCircle, CheckCircle2, Circle, Clock, Filter, Plus, Search, Trash2, User2 } from 'lucide-react';
import { deleteTask, fetchTasks, safeProfiles, saveTask } from '../lib/supabaseData';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { usePermissions } from '../hooks/usePermissions';
import { subscribeAssistantActions } from '../lib/commandBus';
import type { ProfileSummary, TaskPriority, TaskRecord, TaskStatus } from '../types/domain';

const STATUS_OPTIONS: TaskStatus[] = ['pending', 'completed', 'cancelled'];
const EDITABLE_STATUS_OPTIONS: TaskStatus[] = ['pending', 'completed'];
const PRIORITY_OPTIONS: TaskPriority[] = ['low', 'medium', 'high'];

interface TaskModalProps {
  open: boolean;
  profiles: ProfileSummary[];
  initialTask: Partial<TaskRecord> | null;
  onClose: () => void;
  onSaved: () => void;
}

function getProfileDisplayName(profile: ProfileSummary | null | undefined) {
  if (!profile) return 'Unassigned';
  return profile.full_name?.trim() || 'Unnamed user';
}

function getDueDateInputValue(value?: string | null) {
  if (!value) return '';
  return format(parseISO(value), 'yyyy-MM-dd');
}

function getDueTimeInputValue(value?: string | null) {
  if (!value || !value.includes('T')) return '';
  return format(parseISO(value), 'HH:mm');
}

function updateTaskDueDate(currentValue: string | null | undefined, nextDate: string, nextTime?: string) {
  if (!nextDate) return null;
  const timeValue = nextTime ?? getDueTimeInputValue(currentValue);
  return timeValue ? `${nextDate}T${timeValue}` : nextDate;
}

function updateTaskDueTime(currentValue: string | null | undefined, nextTime: string) {
  const dateValue = getDueDateInputValue(currentValue);
  if (!dateValue) return null;
  if (!nextTime) return dateValue;
  return `${dateValue}T${nextTime}`;
}

function formatTaskDueLabel(value?: string | null) {
  if (!value) return 'No due date';
  const parsed = parseISO(value);
  return value.includes('T') ? format(parsed, 'MMM d, h:mm a') : format(parsed, 'MMM d');
}

function TaskModal({ open, profiles, initialTask, onClose, onSaved }: TaskModalProps) {
  const [form, setForm] = useState<Partial<TaskRecord>>({
    status: 'pending',
    priority: 'medium',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setError(null);
      setForm(
        initialTask || {
          status: 'pending',
          priority: 'medium',
        }
      );
    }
  }, [open, initialTask]);

  if (!open) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await saveTask(form);
      onSaved();
      onClose();
    } catch {
      setError('Failed to save task. Please try again.');
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

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">Status</span>
              <select
                value={form.status || 'pending'}
                onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as TaskStatus }))}
                className="input-base"
              >
                {EDITABLE_STATUS_OPTIONS.map((status) => (
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
          </div>

          <div className="rounded-2xl border border-border bg-slate-50/80 p-4">
            <div className="mb-3">
              <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">Due</span>
              <p className="mt-1 text-xs text-text-secondary">Choose a day, and optionally a time.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">Date</span>
                <input
                  type="date"
                  value={getDueDateInputValue(form.due_date)}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      due_date: updateTaskDueDate(current.due_date ?? null, event.target.value),
                    }))
                  }
                  className="input-base"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">Time</span>
                <input
                  type="time"
                  value={getDueTimeInputValue(form.due_date)}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      due_date: updateTaskDueTime(current.due_date ?? null, event.target.value),
                    }))
                  }
                  className="input-base"
                  disabled={!getDueDateInputValue(form.due_date)}
                />
              </label>
            </div>
            <button
              type="button"
              className="mt-3 text-sm font-medium text-text-secondary transition hover:text-text-primary"
              onClick={() => setForm((current) => ({ ...current, due_date: null }))}
            >
              Clear due date
            </button>
          </div>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">Assign to</span>
            <select
              value={form.user_id_assigned_to || form.assigned_to || ''}
              onChange={(event) => setForm((current) => ({ ...current, user_id_assigned_to: event.target.value || null, assigned_to: event.target.value || null }))}
              className="input-base"
            >
              <option value="">Unassigned</option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {getProfileDisplayName(profile)}
                </option>
              ))}
            </select>
          </label>

          {error && (
            <p className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm text-rose-600">{error}</p>
          )}
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
  const { canCreateTasks, canEditTasks, canDeleteTasks } = usePermissions();
  const location = useLocation();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [profiles, setProfiles] = useState<ProfileSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('me');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [dueFilter, setDueFilter] = useState<'all' | 'overdue' | 'today' | 'upcoming'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Partial<TaskRecord> | null>(null);
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null);

  const focusedTaskId = useMemo(() => new URLSearchParams(location.search).get('task'), [location.search]);

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
    if (!focusedTaskId) return;
    setAssigneeFilter('all');
    setStatusFilter('all');
    setPriorityFilter('all');
    setDueFilter('all');
  }, [focusedTaskId]);

  useEffect(() => {
    return subscribeAssistantActions((action) => {
      if (action.type === 'create_task') {
        if (canCreateTasks) {
          setSelectedTask({
            title: action.payload?.title || '',
            due_date: action.payload?.startsAt ? String(action.payload.startsAt).slice(0, 10) : null,
            status: 'pending',
            priority: 'medium',
          });
          setModalOpen(true);
        }
      }
    });
  }, [canCreateTasks]);

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
      const matchesAssignee =
        assigneeFilter === 'all' ||
        (assigneeFilter === 'me' ? task.assigned_to === authUser?.id : task.assigned_to === assigneeFilter);
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
  }, [tasks, search, assigneeFilter, authUser?.id, statusFilter, priorityFilter, dueFilter]);

  useEffect(() => {
    if (!focusedTaskId || loading) return;
    const taskExists = filteredTasks.some((task) => task.id === focusedTaskId);
    if (!taskExists) return;

    setHighlightedTaskId(focusedTaskId);
    requestAnimationFrame(() => {
      document.getElementById(`task-row-${focusedTaskId}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    });

    const clearHighlightTimer = window.setTimeout(() => setHighlightedTaskId(null), 2800);
    navigate('/tasks', { replace: true });

    return () => window.clearTimeout(clearHighlightTimer);
  }, [filteredTasks, focusedTaskId, loading, navigate]);

  const quickUpdateStatus = async (task: TaskRecord, status: TaskStatus) => {
    await saveTask({
      ...task,
      status,
      completed_at: status === 'completed' ? new Date().toISOString() : null,
    });
    load();
  };

  const handleDeleteTask = async (task: TaskRecord) => {
    const confirmed = window.confirm(`Delete "${task.title}"?`);
    if (!confirmed) return;
    await deleteTask(task.id);
    await load();
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
        {canCreateTasks && (
        <button
          type="button"
          onClick={() => {
            setSelectedTask({
              assigned_to: authUser?.id || null,
              status: 'pending',
              priority: 'medium',
            });
            setModalOpen(true);
          }}
          className="btn-primary"
        >
          <Plus className="h-4 w-4" />
          New Task
        </button>
        )}
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
          <option value="me">Assigned to me</option>
          <option value="all">All assignees</option>
          {profiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {getProfileDisplayName(profile)}
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
                  const isCompleted = task.status === 'completed';
                  const isHighlighted = highlightedTaskId === task.id;
                  return (
                    <tr
                      key={task.id}
                      id={`task-row-${task.id}`}
                      className={[
                        'align-top scroll-mt-24 transition-colors',
                        isCompleted ? 'bg-slate-50/70 text-text-secondary' : '',
                        isHighlighted ? 'bg-brand-dim/70 ring-1 ring-brand/20' : '',
                      ].join(' ')}
                    >
                      <td className="px-6 py-5">
                        {canEditTasks ? (
                        <button
                          type="button"
                          className="text-left"
                          onClick={() => {
                            setSelectedTask(task);
                            setModalOpen(true);
                          }}
                        >
                          <div className={`font-semibold ${isCompleted ? 'text-text-secondary line-through' : 'text-text-primary'}`}>
                            {task.title}
                          </div>
                          {task.description && (
                            <p className={`mt-1 text-sm ${isCompleted ? 'text-text-muted line-through' : 'text-text-secondary'}`}>
                              {task.description}
                            </p>
                          )}
                        </button>
                        ) : (
                          <div>
                            <div className={`font-semibold ${isCompleted ? 'text-text-secondary line-through' : 'text-text-primary'}`}>
                              {task.title}
                            </div>
                            {task.description && (
                              <p className={`mt-1 text-sm ${isCompleted ? 'text-text-muted line-through' : 'text-text-secondary'}`}>
                                {task.description}
                              </p>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-5 text-sm text-text-secondary">
                        <div className="inline-flex items-center gap-2">
                          <User2 className="h-4 w-4 text-text-tertiary" />
                          {getProfileDisplayName(assignee)}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span
                          className={[
                            'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize',
                            task.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-700'
                              : task.status === 'cancelled'
                                ? 'bg-slate-100 text-slate-500'
                                : 'bg-brand-dim text-brand',
                          ].join(' ')}
                        >
                          {task.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`badge ${task.priority === 'urgent' ? 'badge-error' : task.priority === 'high' ? 'badge-warning' : 'badge-primary'}`}>
                          {task.priority}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-sm">
                        {task.due_date ? (() => {
                          const d = parseISO(task.due_date);
                          const overdue = isPast(d) && !isToday(d) && task.status !== 'completed';
                          const today = isToday(d) && task.status !== 'completed';
                          return (
                            <span
                              className={[
                                overdue
                                  ? 'text-red-600 font-semibold'
                                  : today
                                    ? 'text-amber-600 font-semibold'
                                    : 'text-text-secondary',
                                isCompleted ? 'line-through opacity-70' : '',
                              ].join(' ')}
                            >
                              {overdue && <AlertCircle className="inline mr-1 h-3.5 w-3.5 -mt-px" />}
                              {today && <Clock className="inline mr-1 h-3.5 w-3.5 -mt-px" />}
                              {formatTaskDueLabel(task.due_date)}
                            </span>
                          );
                        })() : <span className="text-text-muted">{formatTaskDueLabel(task.due_date)}</span>}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => quickUpdateStatus(task, isCompleted ? 'pending' : 'completed')}
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${isCompleted ? 'bg-slate-100 text-slate-700' : 'bg-slate-950 text-white'}`}
                          >
                            <CheckCircle2 className="mr-1 inline h-3 w-3" />
                            {isCompleted ? 'Reopen' : 'Complete'}
                          </button>
                          {canDeleteTasks ? (
                            <button
                              type="button"
                              onClick={() => void handleDeleteTask(task)}
                              className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700"
                            >
                              <Trash2 className="mr-1 inline h-3 w-3" />
                              Delete
                            </button>
                          ) : null}
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
