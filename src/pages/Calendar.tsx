import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  addDays,
  addMonths,
  addWeeks,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfToday,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from 'date-fns';
import {
  CalendarDays,
  CheckSquare2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Flag,
  Loader2,
  Pencil,
  Plus,
  Target,
  Trash2,
  X,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useCurrentUser } from '../hooks/useCurrentUser';

type ViewMode = 'month' | 'week' | 'day';

type CalendarEventRow = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  event_type: string;
  starts_at: string;
  ends_at: string | null;
  is_recurring: boolean;
  recurrence_rule: Record<string, any> | null;
  recurrence_interval: number | null;
  linked_track: string | null;
  source_table: string | null;
  source_id: string | null;
  source_field: string | null;
  created_at: string;
  updated_at: string;
  task_completed?: string | null;
};

type SidebarTask = {
  id: string;
  title: string;
  due_date: string | null;
  completed: string | null;
  priority: string | null;
};

type SidebarGoal = {
  id: string;
  title: string;
  due_by: string | null;
  priority: string | null;
  category: string | null;
  is_timeless: boolean | null;
};

type TaskCalendarRow = {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: string | null;
  completed: string | null;
  user_id_assigned_to: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type EventFormState = {
  title: string;
  description: string;
  event_type: string;
  starts_at: string;
  ends_at: string;
  is_recurring: boolean;
  recurrence_rule: string;
  recurrence_interval: string;
  linked_track: string;
  source_table: string;
  source_id: string;
  source_field: string;
};

const DEFAULT_FORM: EventFormState = {
  title: '',
  description: '',
  event_type: 'general',
  starts_at: '',
  ends_at: '',
  is_recurring: false,
  recurrence_rule: '',
  recurrence_interval: '',
  linked_track: '',
  source_table: '',
  source_id: '',
  source_field: '',
};

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const VIEW_OPTIONS: ViewMode[] = ['month', 'week', 'day'];
const DAY_HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const EVENT_TYPE_OPTIONS = ['general', 'meeting', 'release', 'post', 'show', 'todo', 'goal'] as const;

const EVENT_TYPE_STYLES: Record<string, { chip: string; dot: string }> = {
  general: { chip: 'border-slate-200 bg-slate-100 text-slate-700', dot: 'bg-slate-400' },
  meeting: { chip: 'border-brand/20 bg-brand/8 text-brand', dot: 'bg-brand' },
  release: { chip: 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700', dot: 'bg-fuchsia-500' },
  post: { chip: 'border-emerald-200 bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  show: { chip: 'border-amber-200 bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  todo: { chip: 'border-sky-200 bg-sky-50 text-sky-700', dot: 'bg-sky-500' },
  goal: { chip: 'border-violet-200 bg-violet-50 text-violet-700', dot: 'bg-violet-500' },
};

function getEventTypeStyle(eventType: string) {
  return EVENT_TYPE_STYLES[eventType] ?? EVENT_TYPE_STYLES.general;
}

function getDayKey(date: Date) {
  return format(date, 'yyyy-MM-dd');
}

function toEditorDateTime(date: Date) {
  return `${format(date, 'yyyy-MM-dd')}T09:00`;
}

function formatEventTime(iso: string) {
  const date = parseISO(iso);
  const isMidnight = date.getHours() === 0 && date.getMinutes() === 0;
  return isMidnight ? 'All day' : format(date, 'p');
}

function isAllDayEvent(iso: string) {
  const date = parseISO(iso);
  return date.getHours() === 0 && date.getMinutes() === 0;
}

function getVisibleRange(focusDate: Date, viewMode: ViewMode) {
  if (viewMode === 'month') {
    return {
      start: startOfWeek(startOfMonth(focusDate)),
      end: endOfWeek(endOfMonth(focusDate)),
    };
  }

  if (viewMode === 'week') {
    return {
      start: startOfWeek(focusDate),
      end: endOfWeek(focusDate),
    };
  }

  return {
    start: startOfDay(focusDate),
    end: endOfDay(focusDate),
  };
}

function shiftFocusDate(date: Date, viewMode: ViewMode, direction: 'prev' | 'next') {
  if (viewMode === 'month') return direction === 'prev' ? subMonths(date, 1) : addMonths(date, 1);
  if (viewMode === 'week') return direction === 'prev' ? subWeeks(date, 1) : addWeeks(date, 1);
  return direction === 'prev' ? subDays(date, 1) : addDays(date, 1);
}

function getRangeLabel(date: Date, viewMode: ViewMode) {
  if (viewMode === 'month') return format(date, 'MMMM yyyy');
  if (viewMode === 'week') {
    const weekStart = startOfWeek(date);
    const weekEnd = endOfWeek(date);
    return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
  }
  return format(date, 'EEEE, MMMM d, yyyy');
}

function EventEditor({
  open,
  initialValue,
  initialStartsAt,
  onClose,
  onSaved,
}: {
  open: boolean;
  initialValue: CalendarEventRow | null;
  initialStartsAt: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<EventFormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (!initialValue) {
      setForm({
        ...DEFAULT_FORM,
        starts_at: initialStartsAt,
      });
      return;
    }

    setForm({
      title: initialValue.title ?? '',
      description: initialValue.description ?? '',
      event_type: initialValue.event_type ?? 'general',
      starts_at: initialValue.starts_at ? initialValue.starts_at.slice(0, 16) : initialStartsAt,
      ends_at: initialValue.ends_at ? initialValue.ends_at.slice(0, 16) : '',
      is_recurring: Boolean(initialValue.is_recurring),
      recurrence_rule: initialValue.recurrence_rule ? JSON.stringify(initialValue.recurrence_rule, null, 2) : '',
      recurrence_interval: initialValue.recurrence_interval ? String(initialValue.recurrence_interval) : '',
      linked_track: initialValue.linked_track ?? '',
      source_table: initialValue.source_table ?? '',
      source_id: initialValue.source_id ?? '',
      source_field: initialValue.source_field ?? '',
    });
  }, [initialStartsAt, initialValue, open]);

  if (!open) return null;

  const update = <K extends keyof EventFormState>(key: K, value: EventFormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const payload = {
        user_id: session?.user?.id ?? null,
        title: form.title.trim(),
        description: form.description.trim() || null,
        event_type: form.event_type.trim() || 'general',
        starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
        ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
        is_recurring: form.is_recurring,
        recurrence_rule: form.recurrence_rule.trim() ? JSON.parse(form.recurrence_rule) : null,
        recurrence_interval: form.recurrence_interval ? Number(form.recurrence_interval) : null,
        linked_track: form.linked_track || null,
        source_table: form.source_table || null,
        source_id: form.source_id || null,
        source_field: form.source_field || null,
        updated_at: new Date().toISOString(),
      };

      const query = initialValue
        ? supabase.from('calendar_events').update(payload).eq('id', initialValue.id)
        : supabase.from('calendar_events').insert([payload]);

      const { error } = await query;
      if (error) throw error;
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-[2rem] border border-border bg-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-text-muted">Calendar</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-text-primary">
              {initialValue ? 'Edit event' : 'New event'}
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Add the details that should appear on the calendar.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border bg-white p-2 text-text-muted transition hover:border-brand/30 hover:text-text-primary"
            aria-label="Close event editor"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          <div>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">Event type</span>
            <div className="flex flex-wrap gap-2">
              {EVENT_TYPE_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => update('event_type', option)}
                  className={[
                    'rounded-xl px-3 py-2 text-sm font-semibold capitalize transition',
                    form.event_type === option
                      ? 'bg-brand text-white shadow-sm'
                      : 'border border-border bg-slate-50 text-text-secondary hover:border-brand/25 hover:bg-white hover:text-text-primary',
                  ].join(' ')}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">Title</span>
            <input className="input-base" value={form.title} onChange={(event) => update('title', event.target.value)} required />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">Description</span>
            <textarea
              className="input-base min-h-28 resize-none"
              value={form.description}
              onChange={(event) => update('description', event.target.value)}
              placeholder="Notes, location, collaborators, reminders..."
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">Starts</span>
              <input className="input-base" type="datetime-local" value={form.starts_at} onChange={(event) => update('starts_at', event.target.value)} />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">Ends</span>
              <input className="input-base" type="datetime-local" value={form.ends_at} onChange={(event) => update('ends_at', event.target.value)} />
            </label>
          </div>

          <div className="rounded-2xl border border-border bg-slate-50/80 p-4">
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={form.is_recurring} onChange={(event) => update('is_recurring', event.target.checked)} />
              <div>
                <p className="text-sm font-semibold text-text-primary">Recurring event</p>
                <p className="text-xs text-text-secondary">Use an interval if this should repeat.</p>
              </div>
            </label>

            {form.is_recurring ? (
              <label className="mt-4 block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">Repeat every</span>
                <input
                  className="input-base"
                  type="number"
                  min="1"
                  value={form.recurrence_interval}
                  onChange={(event) => update('recurrence_interval', event.target.value)}
                  placeholder="1"
                />
              </label>
            ) : null}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RailCard({
  title,
  count,
  Icon,
  children,
}: {
  title: string;
  count: number;
  Icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[1.75rem] border border-border bg-white p-5 shadow-[0_10px_35px_rgba(15,23,42,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-text-muted">{title}</p>
          <p className="mt-2 text-3xl font-semibold text-text-primary">{count}</p>
        </div>
        <div className="rounded-2xl bg-brand-dim p-3 text-brand">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-5 space-y-3">{children}</div>
    </section>
  );
}

export function Calendar() {
  const { authUser } = useCurrentUser();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [focusDate, setFocusDate] = useState(() => new Date());
  const [events, setEvents] = useState<CalendarEventRow[]>([]);
  const [sidebarTasks, setSidebarTasks] = useState<SidebarTask[]>([]);
  const [sidebarGoals, setSidebarGoals] = useState<SidebarGoal[]>([]);
  const [sidebarEvents, setSidebarEvents] = useState<CalendarEventRow[]>([]);
  const [taskItems, setTaskItems] = useState<CalendarEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEventRow | null>(null);

  const visibleRange = useMemo(() => getVisibleRange(focusDate, viewMode), [focusDate, viewMode]);
  const visibleRangeStart = visibleRange.start;
  const visibleRangeEnd = visibleRange.end;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const userId = authUser?.id;
      if (!userId) {
        setEvents([]);
        setTaskItems([]);
        setSidebarTasks([]);
        setSidebarGoals([]);
        setSidebarEvents([]);
        return;
      }

      const nextDay = addDays(visibleRangeEnd, 1);

      const [eventsRes, tasksRes, goalsRes, upcomingEventsRes, visibleTasksRes] = await Promise.all([
        supabase
          .from('calendar_events')
          .select('*')
          .eq('user_id', userId)
          .gte('starts_at', visibleRangeStart.toISOString())
          .lt('starts_at', addDays(visibleRangeEnd, 1).toISOString())
          .order('starts_at', { ascending: true }),
        supabase
          .from('tasks')
          .select('id,title,due_date,completed,priority')
          .or(`user_id_assigned_by.eq.${userId},user_id_assigned_to.eq.${userId}`)
          .order('due_date', { ascending: true })
          .limit(6),
        supabase
          .from('goals')
          .select('id,title,due_by,priority,category,is_timeless')
          .eq('user_id', userId)
          .order('due_by', { ascending: true })
          .limit(6),
        supabase
          .from('calendar_events')
          .select('*')
          .eq('user_id', userId)
          .gte('starts_at', startOfToday().toISOString())
          .order('starts_at', { ascending: true })
          .limit(6),
        supabase
          .from('tasks')
          .select('id,title,description,due_date,priority,completed,user_id_assigned_to,created_at,updated_at')
          .or(`user_id_assigned_by.eq.${userId},user_id_assigned_to.eq.${userId}`)
          .neq('completed', 'cancelled')
          .gte('due_date', format(visibleRangeStart, 'yyyy-MM-dd'))
          .lt('due_date', format(nextDay, 'yyyy-MM-dd'))
          .order('due_date', { ascending: true }),
      ]);

      const firstError = eventsRes.error || tasksRes.error || goalsRes.error || upcomingEventsRes.error || visibleTasksRes.error;
      if (firstError) throw firstError;

      setEvents((eventsRes.data ?? []) as CalendarEventRow[]);
      setSidebarTasks(
        ((tasksRes.data ?? []) as SidebarTask[]).filter((task) => task.completed !== 'completed' && Boolean(task.due_date)),
      );
      setSidebarGoals(
        ((goalsRes.data ?? []) as SidebarGoal[]).filter((goal) => Boolean(goal.due_by) && !goal.is_timeless),
      );
      setSidebarEvents((upcomingEventsRes.data ?? []) as CalendarEventRow[]);
      setTaskItems(
        ((visibleTasksRes.data ?? []) as TaskCalendarRow[])
          .filter((task) => Boolean(task.due_date))
          .map((task) => {
            const hasTime = task.due_date?.includes('T');
            return {
              id: `task-${task.id}`,
              user_id: userId,
              title: task.title,
              description: task.description ?? null,
              event_type: 'todo',
              starts_at: hasTime ? new Date(task.due_date as string).toISOString() : `${task.due_date}T00:00:00.000Z`,
              ends_at: null,
              is_recurring: false,
              recurrence_rule: null,
              recurrence_interval: null,
              linked_track: null,
              source_table: 'tasks',
              source_id: task.id,
              source_field: 'due_date',
              created_at: task.created_at ?? new Date().toISOString(),
              updated_at: task.updated_at ?? new Date().toISOString(),
              task_completed: task.completed ?? null,
            } satisfies CalendarEventRow;
          }),
      );
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load calendar');
    } finally {
      setLoading(false);
    }
  }, [authUser?.id, visibleRangeEnd, visibleRangeStart]);

  useEffect(() => {
    void load();
  }, [load]);

  const deleteEvent = async (eventId: string) => {
    const { error: deleteError } = await supabase.from('calendar_events').delete().eq('id', eventId);
    if (!deleteError) {
      void load();
    }
  };

  const calendarItems = useMemo(() => {
    return [...events, ...taskItems].sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  }, [events, taskItems]);

  const eventsByDay = useMemo(() => {
    return calendarItems.reduce<Record<string, CalendarEventRow[]>>((accumulator, event) => {
      const key = getDayKey(parseISO(event.starts_at));
      if (!accumulator[key]) accumulator[key] = [];
      accumulator[key].push(event);
      return accumulator;
    }, {});
  }, [calendarItems]);

  const monthDays = useMemo(() => {
    const days: Date[] = [];
    let cursor = visibleRangeStart;
    while (cursor <= visibleRangeEnd) {
      days.push(cursor);
      cursor = addDays(cursor, 1);
    }
    return days;
  }, [visibleRangeEnd, visibleRangeStart]);

  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(focusDate);
    return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  }, [focusDate]);

  const dayEvents = useMemo(() => {
    const key = getDayKey(focusDate);
    return [...(eventsByDay[key] ?? [])].sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  }, [eventsByDay, focusDate]);

  const allDayEvents = useMemo(() => dayEvents.filter((event) => isAllDayEvent(event.starts_at)), [dayEvents]);
  const timedDayEvents = useMemo(() => dayEvents.filter((event) => !isAllDayEvent(event.starts_at)), [dayEvents]);

  const openCreateForDate = (date: Date) => {
    setFocusDate(date);
    setEditingEvent(null);
    setEditorOpen(true);
  };

  const openEditEvent = (event: CalendarEventRow) => {
    if (event.source_table === 'tasks' && event.source_id) {
      navigate(`/tasks?task=${event.source_id}`);
      return;
    }
    setFocusDate(parseISO(event.starts_at));
    setEditingEvent(event);
    setEditorOpen(true);
  };

  const switchView = (nextView: ViewMode) => {
    setViewMode(nextView);
  };

  const renderEventChip = (event: CalendarEventRow, compact = false) => {
    const style = getEventTypeStyle(event.event_type);
    const isCompletedTask = event.source_table === 'tasks' && event.task_completed === 'completed';
    return (
      <button
        key={event.id}
        type="button"
        onClick={() => openEditEvent(event)}
        className={`w-full border text-left transition hover:shadow-sm ${compact ? 'rounded-xl px-2 py-1.5' : 'rounded-[1.1rem] px-3 py-2.5'} ${style.chip} ${isCompletedTask ? 'opacity-75' : ''}`}
      >
        <div className="flex items-start gap-2">
          <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${style.dot}`} />
          <div className="min-w-0">
            <p className={`${compact ? 'text-[11px]' : 'text-xs'} font-semibold uppercase tracking-[0.12em]`}>
              {event.event_type}
            </p>
            <p className={`truncate ${compact ? 'text-xs' : 'text-sm'} font-medium ${isCompletedTask ? 'line-through' : ''}`}>
              {event.title}
            </p>
            <p className={`${compact ? 'mt-0 text-[10px]' : 'mt-0.5 text-[11px]'} opacity-80 ${isCompletedTask ? 'line-through' : ''}`}>
              {formatEventTime(event.starts_at)}
            </p>
          </div>
        </div>
      </button>
    );
  };

  const renderMonthView = () => (
    <div>
      <div className="grid grid-cols-7 border-b border-border bg-slate-50/80">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="px-2 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-text-muted md:px-3">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {monthDays.map((day) => {
          const dayKey = getDayKey(day);
          const dayEvents = eventsByDay[dayKey] ?? [];
          const isSelected = getDayKey(day) === getDayKey(focusDate);
          const isCurrentMonth = format(day, 'M') === format(focusDate, 'M');
          const isCurrentDay = getDayKey(day) === getDayKey(new Date());

          return (
            <div
              key={dayKey}
              role="button"
              tabIndex={0}
              onClick={() => setFocusDate(day)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setFocusDate(day);
                }
              }}
              className={[
                'group flex min-h-[94px] flex-col border-r border-b border-border px-2 py-1.5 text-left transition md:min-h-[104px] md:px-2',
                isCurrentMonth ? 'bg-white' : 'bg-slate-50/65',
                isSelected ? 'bg-brand-dim shadow-[inset_0_0_0_1px_var(--color-brand-ring)]' : 'hover:bg-slate-50',
              ].join(' ')}
            >
              <div className="mb-1.5 flex items-start justify-between gap-2">
                <span
                  className={[
                    'inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold md:h-7 md:w-7 md:text-xs',
                    isCurrentDay ? 'bg-brand text-white' : '',
                    !isCurrentDay && isSelected ? 'bg-brand-light text-brand' : '',
                    !isCurrentDay && !isSelected && isCurrentMonth ? 'text-text-primary' : '',
                    !isCurrentDay && !isSelected && !isCurrentMonth ? 'text-text-muted' : '',
                  ].join(' ')}
                >
                  {format(day, 'd')}
                </span>
                <button
                  type="button"
                  className="rounded-lg p-1 text-text-muted opacity-0 transition hover:bg-white hover:text-brand group-hover:opacity-100"
                  onClick={(event) => {
                    event.stopPropagation();
                    openCreateForDate(day);
                  }}
                  aria-label={`Add event on ${format(day, 'MMMM d')}`}
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>

              <div className="space-y-1">
                {dayEvents.slice(0, 1).map((event) => renderEventChip(event, true))}
                {dayEvents.length > 1 ? (
                  <p className="px-1 text-[10px] font-medium text-text-secondary">+{dayEvents.length - 1} more</p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderWeekView = () => (
    <div>
      <div className="grid grid-cols-7 gap-0 border-b border-border bg-slate-50/80">
        {weekDays.map((day) => {
          const isSelected = getDayKey(day) === getDayKey(focusDate);
          const isCurrentDay = getDayKey(day) === getDayKey(new Date());
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => setFocusDate(day)}
              className={`border-r border-border px-2 py-3 text-left transition md:px-3 ${isSelected ? 'bg-brand-dim' : 'hover:bg-slate-100/70'}`}
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-muted">{format(day, 'EEE')}</p>
              <div className="mt-2 flex items-center gap-2">
                <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold md:h-9 md:w-9 md:text-sm ${isCurrentDay ? 'bg-brand text-white' : isSelected ? 'bg-brand-light text-brand' : 'text-text-primary'}`}>
                  {format(day, 'd')}
                </span>
                <span className="text-xs text-text-secondary md:text-sm">{format(day, 'MMM')}</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-7">
        {weekDays.map((day) => {
          const dayEvents = eventsByDay[getDayKey(day)] ?? [];
          return (
            <div key={day.toISOString()} className="min-h-[480px] border-r border-border px-2 py-3 md:px-2.5">
              <button
                type="button"
                className="mb-3 flex w-full items-center justify-center rounded-xl border border-dashed border-border py-2 text-[11px] font-semibold text-text-muted transition hover:border-brand/40 hover:text-brand"
                onClick={() => openCreateForDate(day)}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add
              </button>
              <div className="space-y-2">
                {dayEvents.length > 0 ? dayEvents.map((event) => renderEventChip(event, true)) : (
                  <div className="rounded-2xl border border-dashed border-border bg-slate-50 px-2 py-5 text-center text-[11px] text-text-muted">
                    No events
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderDayView = () => (
    <div className="space-y-5">
      {allDayEvents.length > 0 ? (
        <div className="rounded-2xl border border-border bg-slate-50/70 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-text-muted">All day</p>
          <div className="mt-3 space-y-2">
            {allDayEvents.map((event) => renderEventChip(event))}
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-3xl border border-border">
        {DAY_HOURS.map((hour) => {
          const hourEvents = timedDayEvents.filter((event) => parseISO(event.starts_at).getHours() === hour);
          return (
            <div key={hour} className="grid grid-cols-[70px_minmax(0,1fr)] border-b border-border last:border-b-0 md:grid-cols-[82px_minmax(0,1fr)]">
              <div className="bg-slate-50/80 px-3 py-4 text-[11px] font-semibold uppercase tracking-[0.15em] text-text-muted md:px-4">
                {format(new Date().setHours(hour, 0, 0, 0), 'ha')}
              </div>
              <div className="min-h-[60px] px-3 py-3 md:px-4">
                {hourEvents.length > 0 ? (
                  <div className="space-y-2">
                    {hourEvents.map((event) => renderEventChip(event))}
                  </div>
                ) : (
                  <button
                    type="button"
                    className="flex h-full min-h-[40px] w-full items-center rounded-xl border border-dashed border-transparent px-3 text-sm text-text-muted transition hover:border-brand/25 hover:bg-brand-dim hover:text-brand"
                    onClick={() => openCreateForDate(startOfDay(focusDate))}
                  >
                    Open slot
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-8 pb-20">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-brand" />
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_22rem]">
          <section className="overflow-hidden rounded-[2rem] border border-border bg-white shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-4 md:px-6">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold tracking-tight text-text-primary md:text-3xl">Calendar</h1>
                <span className="text-sm text-text-secondary">{getRangeLabel(focusDate, viewMode)}</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 rounded-2xl border border-border bg-slate-50 p-1">
                  {VIEW_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => switchView(option)}
                      className={[
                        'rounded-xl px-3 py-1.5 text-sm font-semibold capitalize transition',
                        viewMode === option
                          ? 'bg-brand text-white shadow-sm'
                          : 'text-text-secondary hover:bg-white hover:text-text-primary',
                      ].join(' ')}
                    >
                      {option}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  className="rounded-xl border border-border bg-white px-3 py-2 text-sm font-medium text-text-secondary transition hover:border-brand/30 hover:text-text-primary"
                  onClick={() => setFocusDate(shiftFocusDate(focusDate, viewMode, 'prev'))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium text-text-secondary transition hover:border-brand/30 hover:text-text-primary"
                  onClick={() => setFocusDate(new Date())}
                >
                  Today
                </button>
                <button
                  type="button"
                  className="rounded-xl border border-border bg-white px-3 py-2 text-sm font-medium text-text-secondary transition hover:border-brand/30 hover:text-text-primary"
                  onClick={() => setFocusDate(shiftFocusDate(focusDate, viewMode, 'next'))}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => openCreateForDate(focusDate)}
                >
                  <Plus className="h-4 w-4" />
                  New event
                </button>
              </div>
            </div>

            <div className="px-4 py-4 md:px-6 md:py-6">
              {viewMode === 'month' ? renderMonthView() : null}
              {viewMode === 'week' ? renderWeekView() : null}
              {viewMode === 'day' ? renderDayView() : null}
            </div>
          </section>

          <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
            <RailCard title="Upcoming To-Dos" count={sidebarTasks.length} Icon={CheckSquare2}>
              {sidebarTasks.length > 0 ? sidebarTasks.map((task) => (
                <article key={task.id} className="rounded-2xl border border-border bg-slate-50/80 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-text-primary">{task.title}</p>
                      <p className="mt-1 text-xs text-text-secondary">
                        {task.due_date ? format(parseISO(task.due_date), 'MMM d, yyyy') : 'No due date'}
                      </p>
                    </div>
                    {task.priority ? (
                      <span className="rounded-full bg-brand-dim px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-brand">
                        {task.priority}
                      </span>
                    ) : null}
                  </div>
                </article>
              )) : (
                <div className="rounded-2xl border border-dashed border-border bg-slate-50 px-4 py-6 text-sm text-text-muted">
                  No upcoming to-dos.
                </div>
              )}
            </RailCard>

            <RailCard title="Upcoming Goals" count={sidebarGoals.length} Icon={Target}>
              {sidebarGoals.length > 0 ? sidebarGoals.map((goal) => (
                <article key={goal.id} className="rounded-2xl border border-border bg-slate-50/80 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-text-primary">{goal.title}</p>
                      <p className="mt-1 text-xs text-text-secondary">
                        {goal.due_by ? format(parseISO(goal.due_by), 'MMM d, yyyy') : 'No due date'}
                      </p>
                    </div>
                    <div className="text-right">
                      {goal.category ? (
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-brand">{goal.category}</p>
                      ) : null}
                      {goal.priority ? (
                        <p className="mt-1 text-[11px] text-text-secondary">{goal.priority}</p>
                      ) : null}
                    </div>
                  </div>
                </article>
              )) : (
                <div className="rounded-2xl border border-dashed border-border bg-slate-50 px-4 py-6 text-sm text-text-muted">
                  No upcoming goals.
                </div>
              )}
            </RailCard>

            <RailCard title="Upcoming Events" count={sidebarEvents.length} Icon={Flag}>
              {sidebarEvents.length > 0 ? sidebarEvents.map((event) => (
                <article key={event.id} className="rounded-2xl border border-border bg-slate-50/80 px-4 py-3">
                  <div className="flex items-start gap-3">
                    <div className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${getEventTypeStyle(event.event_type).dot}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-text-primary">{event.title}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.12em] text-brand">{event.event_type}</p>
                      <p className="mt-1 text-xs text-text-secondary">{format(parseISO(event.starts_at), 'MMM d, yyyy · p')}</p>
                    </div>
                  </div>
                </article>
              )) : (
                <div className="rounded-2xl border border-dashed border-border bg-slate-50 px-4 py-6 text-sm text-text-muted">
                  No upcoming events.
                </div>
              )}
            </RailCard>
          </aside>
        </div>
      )}

      <EventEditor
        open={editorOpen}
        initialValue={editingEvent}
        initialStartsAt={toEditorDateTime(focusDate)}
        onClose={() => setEditorOpen(false)}
        onSaved={() => void load()}
      />
    </div>
  );
}
