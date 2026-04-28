import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar as CalendarIcon,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Music,
  Plus,
  Share2,
  Target,
  Video,
  Zap,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { ApiErrorBanner } from '../components/ApiErrorBanner';
import { CalendarEventModal } from '../components/CalendarEventModal';
import { CalendarEventDetailModal } from '../components/CalendarEventDetailModal';
import { CalendarSlotDrawer } from '../components/CalendarSlotDrawer';
import { CalendarInsightsPanel } from '../components/CalendarInsightsPanel';
import { CalendarAIAssistant, parseCalendarIntent } from '../components/CalendarAIAssistant';
import { subscribeAssistantActions } from '../lib/commandBus';
import { useAssistantPageContext } from '../hooks/useAssistantPageContext';
import type { IntentResult } from '../components/CalendarAIAssistant';

// ── Constants ────────────────────────────────────────────────────────────────

/** Visible hour range in week / day time-grid views */
const HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // 06:00 → 23:00
/** Best posting hour slots — shown with an amber tint in time-grid */
const BEST_POST_HOURS = new Set([9, 12, 18]);
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ── Types ────────────────────────────────────────────────────────────────────

interface Event {
  id: string;
  title: string;
  date: string;
  time?: string;
  type: 'post' | 'release' | 'show' | 'meeting' | 'todo' | 'goal';
  platform?: string;
  priority?: 'low' | 'medium' | 'high';
  zernioId?: string;
  releaseId?: string;
  status?: string;
  publishStatus?: 'draft' | 'scheduled' | 'published' | 'failed' | 'cancelled';
  notes?: string;
  venue?: string;
  task?: string;
  category?: string;
  target?: number;
  current?: number;
  unit?: string;
  isFullDay?: boolean;
  isRecurring?: boolean;
  recurrencePattern?: 'daily' | 'weekly' | 'monthly';
  recurrenceInterval?: number;
  recurrenceEndDate?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getWeekDays(from: Date): Date[] {
  const start = new Date(from);
  start.setDate(from.getDate() - from.getDay()); // Sunday
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function formatHour(h: number): string {
  if (h === 0 || h === 24) return '12a';
  if (h === 12) return '12p';
  return h > 12 ? `${h - 12}p` : `${h}a`;
}

function eventPillClass(event: Event): string {
  if (event.type === 'release' || event.isFullDay) return 'bg-blue-600 text-white';
  switch (event.type) {
    case 'post':
      if (event.publishStatus === 'published') return 'bg-emerald-50 text-emerald-700 border border-emerald-100';
      if (event.publishStatus === 'failed')    return 'bg-rose-50 text-rose-600 border border-rose-100';
      if (event.publishStatus === 'scheduled') return 'bg-blue-50 text-blue-600 border border-blue-100';
      return 'bg-blue-50 text-blue-600 border border-blue-100';
    case 'show':    return 'bg-rose-50 text-rose-600 border border-rose-100';
    case 'meeting': return 'bg-slate-100 text-slate-700 border border-slate-200';
    case 'todo':    return 'bg-emerald-50 text-emerald-700 border border-emerald-100';
    case 'goal':    return 'bg-amber-50 text-amber-700 border border-amber-100';
    default:        return 'bg-slate-100 text-slate-700 border border-slate-200';
  }
}

function expandRecurringEvents(rawEvents: Event[]): Event[] {
  const expanded: Event[] = [];
  const endRange = new Date();
  endRange.setFullYear(endRange.getFullYear() + 1);

  rawEvents.forEach((event) => {
    if (!event.isRecurring || !event.recurrencePattern) {
      expanded.push(event);
      return;
    }
    const [year, month, day] = event.date.split('-').map(Number);
    let current = new Date(year, month - 1, day);
    const end = event.recurrenceEndDate ? new Date(event.recurrenceEndDate) : endRange;
    const interval = event.recurrenceInterval || 1;
    let count = 0;
    while (current <= end && count < 365) {
      const ds = toDateStr(current);
      expanded.push({ ...event, id: count === 0 ? event.id : `${event.id}-${count}`, date: ds });
      if (event.recurrencePattern === 'daily')   current.setDate(current.getDate() + interval);
      else if (event.recurrencePattern === 'weekly') current.setDate(current.getDate() + 7 * interval);
      else if (event.recurrencePattern === 'monthly') current.setMonth(current.getMonth() + interval);
      else break;
      count++;
    }
  });
  return expanded;
}

// ── Component ────────────────────────────────────────────────────────────────

export function Calendar() {
  const navigate = useNavigate();

  // Core state
  const [view,          setView]         = useState<'month' | 'week' | 'day'>('month');
  const [currentDate,   setCurrentDate]  = useState(new Date());
  const [events,        setEvents]       = useState<Event[]>([]);
  const [loading,       setLoading]      = useState(true);
  const [error,         setError]        = useState<Error | null>(null);
  const [selectedDate,  setSelectedDate] = useState<string>(toDateStr(new Date()));
  const [draggedEvent,  setDraggedEvent] = useState<Event | null>(null);

  // Modals
  const [isModalOpen,       setIsModalOpen]       = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedEvent,     setSelectedEvent]     = useState<Event | null>(null);
  const [modalType,         setModalType]         = useState<Event['type'] | undefined>();

  // Slot drawer (create-from-empty-slot)
  const [slotOpen,         setSlotOpen]         = useState(false);
  const [slotDate,         setSlotDate]         = useState('');
  const [slotTime,         setSlotTime]         = useState<string | undefined>();
  const [slotPrefillTitle, setSlotPrefillTitle] = useState('');
  const [slotPrefillType,  setSlotPrefillType]  = useState<'event' | 'task' | undefined>();

  // ── Data fetching ────────────────────────────────────────────────────────

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const safe = async (q: any) => {
        const res = await q;
        if (res?.error?.code === '42P01') return { data: [] };
        return res;
      };

      const [releasesRes, contentRes, showsRes, meetingsRes, todosRes, goalsRes, tasksRes, ppRes] =
        await Promise.all([
          safe(supabase.from('releases').select('id,title,release_date,notes,status')),
          safe(supabase.from('content_items').select('id,title,scheduled_date,scheduled_time,platform,publish_status,zernio_id,zernio_post_id,caption,is_full_day,is_recurring,recurrence_pattern,recurrence_interval,recurrence_end_date')),
          safe(supabase.from('shows').select('id,title,venue,date,time,status')),
          safe(supabase.from('meetings').select('id,title,date,time,notes,is_recurring,recurrence_pattern,recurrence_interval,recurrence_end_date')),
          safe(supabase.from('todos').select('id,task,title,due_date,due_time,priority,completed')),
          safe(supabase.from('goals').select('id,title,deadline,category,target,current,unit')),
          safe(supabase.from('tasks').select('id,title,due_date,priority,status')),
          safe(supabase.from('platform_posts').select('id,platform,status,scheduled_at,content_items(title)')),
        ]);

      const rawEvents: Event[] = [
        ...(releasesRes.data || [])
          .filter((r: any) => r.release_date)
          .map((r: any) => ({
            id: r.id, title: r.title, date: r.release_date,
            type: 'release' as const, isFullDay: true,
            notes: r.notes, status: r.status, releaseId: r.id,
          })),

        ...(contentRes.data || [])
          .filter((c: any) => c.scheduled_date)
          .map((c: any) => ({
            id: c.id, title: c.title,
            date: (c.scheduled_date || '').split('T')[0],
            time: c.scheduled_time,
            type: 'post' as const,
            platform: c.platform,
            publishStatus: c.publish_status || 'draft',
            zernioId: c.zernio_id || c.zernio_post_id,
            notes: c.caption,
            isFullDay: c.is_full_day,
            isRecurring: c.is_recurring,
            recurrencePattern: c.recurrence_pattern,
            recurrenceInterval: c.recurrence_interval,
            recurrenceEndDate: c.recurrence_end_date,
          })),

        ...(showsRes.data || [])
          .filter((s: any) => s.date)
          .map((s: any) => ({
            id: s.id, title: s.venue || s.title || 'Show',
            date: s.date, time: s.time,
            type: 'show' as const, venue: s.venue, status: s.status,
          })),

        ...(meetingsRes.data || [])
          .filter((m: any) => m.date)
          .map((m: any) => ({
            id: m.id, title: m.title, date: m.date, time: m.time,
            type: 'meeting' as const, notes: m.notes,
            isRecurring: m.is_recurring,
            recurrencePattern: m.recurrence_pattern,
            recurrenceInterval: m.recurrence_interval,
            recurrenceEndDate: m.recurrence_end_date,
          })),

        ...(todosRes.data || [])
          .filter((t: any) => t.due_date)
          .map((t: any) => ({
            id: t.id, title: t.task || t.title, date: t.due_date, time: t.due_time,
            type: 'todo' as const, priority: t.priority,
            status: t.completed ? 'completed' : 'pending',
          })),

        ...(tasksRes.data || [])
          .filter((t: any) => t.due_date)
          .map((t: any) => ({
            id: `task_${t.id}`, title: t.title,
            date: (t.due_date || '').split('T')[0],
            time: t.due_date?.includes('T') ? t.due_date.split('T')[1]?.slice(0, 5) : undefined,
            type: 'todo' as const,
            priority: t.priority === 'urgent' ? 'high' : t.priority,
            status: t.status === 'done' ? 'completed' : t.status,
          })),

        ...(goalsRes.data || [])
          .filter((g: any) => g.deadline)
          .map((g: any) => ({
            id: g.id, title: g.title, date: g.deadline,
            type: 'goal' as const, category: g.category,
            target: g.target, current: g.current, unit: g.unit,
          })),

        ...(ppRes.data || [])
          .filter((pp: any) => pp.scheduled_at)
          .map((pp: any) => {
            const d = new Date(pp.scheduled_at);
            return {
              id: `pp_${pp.id}`,
              title: `${pp.content_items?.title || 'Post'} (${pp.platform})`,
              date: toDateStr(d),
              time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
              type: 'post' as const,
              platform: pp.platform,
              publishStatus: pp.status as any,
            };
          }),
      ];

      setEvents(expandRecurringEvents(rawEvents));
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // Register page context so the assistant prioritises calendar commands
  useAssistantPageContext('calendar');

  // Handle structured actions dispatched from the global assistant
  useEffect(() => {
    return subscribeAssistantActions((action) => {
      if (action.type === 'create_calendar_event') {
        if (action.payload?.startsAt) {
          const d = new Date(action.payload.startsAt);
          if (!isNaN(d.getTime())) setSelectedDate(toDateStr(d));
        }
        if (action.payload?.title) setSlotPrefillTitle(action.payload.title);
        setSlotPrefillType('event');
        setIsModalOpen(true);
      }
    });
  }, []);

  // ── Navigation ───────────────────────────────────────────────────────────

  const navigate_ = (direction: 1 | -1) => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      if (view === 'month')      d.setMonth(d.getMonth() + direction);
      else if (view === 'week')  d.setDate(d.getDate() + 7 * direction);
      else                       d.setDate(d.getDate() + direction);
      return d;
    });
  };

  const goToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(toDateStr(new Date()));
  };

  // ── Event queries ────────────────────────────────────────────────────────

  const getEventsForDate = (d: Date) => {
    const ds = toDateStr(d);
    return events.filter((e) => e.date === ds);
  };

  const getEventsForDay = (day: number) => {
    const ds = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter((e) => e.date === ds);
  };

  // ── Slot / intent handlers ───────────────────────────────────────────────

  const openSlot = (date: string, time?: string) => {
    setSlotDate(date);
    setSlotTime(time);
    setSlotPrefillTitle('');
    setSlotPrefillType(undefined);
    setSlotOpen(true);
  };

  const openDetail = (event: Event) => {
    setSelectedEvent(event);
    setIsDetailModalOpen(true);
  };

  const handleAIIntent = (result: IntentResult) => {
    if (result.intent === 'create_event') {
      setSlotDate(result.date);
      setSlotTime(result.time);
      setSlotPrefillTitle(result.title);
      setSlotPrefillType('event');
      setSlotOpen(true);
    } else if (result.intent === 'create_task') {
      setSlotDate(result.date);
      setSlotTime(result.time);
      setSlotPrefillTitle(result.title);
      setSlotPrefillType('task');
      setSlotOpen(true);
    } else if (result.intent === 'schedule_post') {
      navigate('/content', { state: { prefillDate: result.date, prefillTime: result.time } });
    }
  };

  // ── Drag-and-drop ────────────────────────────────────────────────────────

  const handleDragStart = (e: React.DragEvent, event: Event) => {
    setDraggedEvent(event);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetDate: string) => {
    e.preventDefault();
    if (!draggedEvent) return;

    // Strip synthetic prefixes to get the real DB row ID
    let rowId = draggedEvent.id;
    let table: string;
    let field: string;

    if (draggedEvent.id.startsWith('task_')) {
      // Tasks from the `tasks` table — strip prefix
      rowId = draggedEvent.id.slice(5);
      table = 'tasks';
      field = 'due_date';
    } else if (draggedEvent.id.startsWith('pp_')) {
      // platform_posts — preserve existing time, only change date
      rowId = draggedEvent.id.slice(3);
      const existingTime = draggedEvent.time ?? '12:00';
      try {
        await supabase
          .from('platform_posts')
          .update({ scheduled_at: `${targetDate}T${existingTime}:00` })
          .eq('id', rowId);
        fetchEvents();
      } catch { /* ignore */ } finally {
        setDraggedEvent(null);
      }
      return;
    } else {
      const tableMap: Record<string, [string, string]> = {
        release: ['releases',      'release_date'],
        post:    ['content_items', 'scheduled_date'],
        show:    ['shows',         'date'],
        meeting: ['meetings',      'date'],
        todo:    ['todos',         'due_date'],
        goal:    ['goals',         'deadline'],
      };
      const mapped = tableMap[draggedEvent.type] ?? ['meetings', 'date'];
      [table, field] = mapped;
    }

    try {
      await supabase.from(table).update({ [field]: targetDate }).eq('id', rowId);
      fetchEvents();
    } catch { /* ignore */ } finally {
      setDraggedEvent(null);
    }
  };

  // ── Render helpers ───────────────────────────────────────────────────────

  const renderEventPill = (event: Event, compact = false) => (
    <div
      key={event.id}
      draggable
      onDragStart={(e) => handleDragStart(e, event)}
      onClick={(e) => { e.stopPropagation(); openDetail(event); }}
      className={cn(
        'truncate rounded-md px-1.5 py-0.5 text-[10px] font-bold cursor-pointer transition-all hover:opacity-90',
        eventPillClass(event),
        compact ? 'mb-0.5' : 'mb-1',
      )}
    >
      {event.time && !event.isFullDay && (
        <span className="mr-1 opacity-60">{event.time}</span>
      )}
      {event.zernioId && <Share2 className="mr-0.5 inline h-2 w-2 opacity-60" />}
      {event.title}
    </div>
  );

  // ── Calendar values ──────────────────────────────────────────────────────

  const daysInMonth   = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const weekDays      = getWeekDays(currentDate);
  const monthName     = currentDate.toLocaleString('default', { month: 'long' });
  const year          = currentDate.getFullYear();
  const todayStr      = toDateStr(new Date());

  const upcomingEvents = events
    .filter((e) => e.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''))
    .slice(0, 8);

  if (error) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
        <ApiErrorBanner error={error} onRetry={() => { setError(null); fetchEvents(); }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-text-primary md:text-4xl">
            {monthName} {year}
          </h2>
          <p className="mt-1 text-text-secondary">Central planner — releases, posts, tasks, goals.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={goToday}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
          >
            Today
          </button>
          <button onClick={() => navigate_(-1)} className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm transition-colors hover:bg-slate-50">
            <ChevronLeft className="h-4 w-4 text-slate-600" />
          </button>
          <button onClick={() => navigate_(1)} className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm transition-colors hover:bg-slate-50">
            <ChevronRight className="h-4 w-4 text-slate-600" />
          </button>
          {/* View switcher */}
          <div className="flex rounded-xl border border-slate-200 bg-slate-100 p-1">
            {(['month', 'week', 'day'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all',
                  view === v ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700',
                )}
              >
                {v}
              </button>
            ))}
          </div>
          <button
            onClick={() => openSlot(selectedDate)}
            className="btn-primary py-2 text-xs"
          >
            <Plus className="h-4 w-4" /> New event
          </button>
        </div>
      </header>

      {/* ── AI Quick-plan bar ─────────────────────────────────────────────── */}
      <CalendarAIAssistant onIntent={handleAIIntent} />

      {/* ── Main grid ────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_260px]">

          {/* ── Calendar body ─────────────────────────────────────────────── */}
          <div className="min-w-0 overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm">

            {/* Month view */}
            {view === 'month' && (
              <>
                <div className="grid grid-cols-7 border-b border-slate-100">
                  {DAY_LABELS.map((d) => (
                    <div key={d} className="py-3 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      {d}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7">
                  {/* Padding cells */}
                  {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                    <div key={`pad-${i}`} className="h-28 border-b border-r border-slate-50 bg-slate-50/30" />
                  ))}
                  {/* Day cells */}
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                    const dayEvents = getEventsForDay(day);
                    const ds = `${year}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const isToday = ds === todayStr;
                    return (
                      <div
                        key={day}
                        className={cn(
                          'group relative h-28 cursor-pointer border-b border-r border-slate-50 p-1.5 transition-colors',
                          selectedDate === ds ? 'bg-blue-50/30' : 'hover:bg-slate-50/40',
                        )}
                        onClick={() => setSelectedDate(ds)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => handleDrop(e, ds)}
                      >
                        <span
                          className={cn(
                            'flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-colors',
                            isToday ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 group-hover:text-slate-900',
                          )}
                        >
                          {day}
                        </span>
                        <div className="mt-1">
                          {dayEvents.slice(0, 3).map((ev) => renderEventPill(ev, true))}
                          {dayEvents.length > 3 && (
                            <p className="text-[9px] font-bold text-slate-400">+{dayEvents.length - 3} more</p>
                          )}
                        </div>
                        {/* Empty-slot click target */}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); openSlot(ds); }}
                          className="absolute bottom-1.5 right-1.5 rounded-lg p-0.5 opacity-0 transition-opacity hover:bg-blue-100 group-hover:opacity-70"
                        >
                          <Plus className="h-3 w-3 text-blue-500" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Week view — time grid */}
            {view === 'week' && (
              <div>
                {/* Day headers */}
                <div
                  className="grid border-b border-slate-100 bg-white"
                  style={{ gridTemplateColumns: '52px repeat(7, 1fr)' }}
                >
                  <div className="border-r border-slate-100" />
                  {weekDays.map((day, i) => {
                    const isToday = toDateStr(day) === todayStr;
                    return (
                      <div key={i} className="flex flex-col items-center py-3 border-r border-slate-100 last:border-r-0">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                          {DAY_LABELS[day.getDay()]}
                        </p>
                        <span
                          className={cn(
                            'mt-1 flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold',
                            isToday ? 'bg-blue-600 text-white shadow-md' : 'text-slate-900',
                          )}
                        >
                          {day.getDate()}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* All-day row */}
                <div
                  className="grid border-b border-slate-200 bg-slate-50/40"
                  style={{ gridTemplateColumns: '52px repeat(7, 1fr)' }}
                >
                  <div className="flex items-center justify-end border-r border-slate-100 pr-2 py-1">
                    <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">All day</span>
                  </div>
                  {weekDays.map((day, i) => {
                    const allDay = getEventsForDate(day).filter((e) => e.isFullDay || e.type === 'release');
                    return (
                      <div
                        key={i}
                        className="min-h-[32px] cursor-pointer border-r border-slate-100 last:border-r-0 p-0.5 hover:bg-blue-50/30"
                        onClick={() => openSlot(toDateStr(day))}
                      >
                        {allDay.map((ev) => (
                          <div
                            key={ev.id}
                            onClick={(e) => { e.stopPropagation(); openDetail(ev); }}
                            className={cn('mb-0.5 cursor-pointer truncate rounded px-1.5 py-0.5 text-[9px] font-bold', eventPillClass(ev))}
                          >
                            {ev.title}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>

                {/* Scrollable time grid */}
                <div className="overflow-y-auto" style={{ maxHeight: '560px' }}>
                  {HOURS.map((h) => {
                    const isBest = BEST_POST_HOURS.has(h);
                    return (
                      <div
                        key={h}
                        className="grid"
                        style={{ gridTemplateColumns: '52px repeat(7, 1fr)' }}
                      >
                        {/* Hour label */}
                        <div className="flex items-start justify-end border-r border-slate-100 pr-2 pt-1">
                          <span className="text-[9px] font-bold text-slate-400">{formatHour(h)}</span>
                        </div>
                        {/* Day cells */}
                        {weekDays.map((day, i) => {
                          const hevents = getEventsForDate(day).filter((e) => {
                            if (e.isFullDay || e.type === 'release') return false;
                            const eh = e.time ? parseInt(e.time.split(':')[0], 10) : -1;
                            return eh === h;
                          });
                          return (
                            <div
                              key={i}
                              className={cn(
                                'group relative h-16 cursor-pointer border-b border-r border-slate-50 last:border-r-0 p-0.5 transition-colors',
                                isBest ? 'bg-amber-50/40 hover:bg-amber-50/70' : 'hover:bg-blue-50/20',
                              )}
                              onClick={() => openSlot(toDateStr(day), `${String(h).padStart(2, '0')}:00`)}
                            >
                              {/* Best-time icon */}
                              {isBest && hevents.length === 0 && (
                                <Zap className="absolute right-1 top-1 h-2.5 w-2.5 text-amber-300/80 opacity-70" />
                              )}
                              {/* Events */}
                              {hevents.map((ev) => (
                                <div
                                  key={ev.id}
                                  onClick={(e) => { e.stopPropagation(); openDetail(ev); }}
                                  className={cn('mb-0.5 truncate rounded px-1.5 py-0.5 text-[9px] font-bold cursor-pointer', eventPillClass(ev))}
                                >
                                  {ev.time} {ev.title}
                                </div>
                              ))}
                              {/* Plus hint */}
                              <Plus className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 text-slate-300 opacity-0 transition-opacity group-hover:opacity-60" />
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Day view — time grid */}
            {view === 'day' && (
              <div>
                {/* Day header */}
                <div className="flex items-center gap-5 border-b border-slate-100 px-6 py-5">
                  <span className="text-5xl font-black text-slate-900">{currentDate.getDate()}</span>
                  <div>
                    <p className="text-xl font-bold text-slate-900">
                      {currentDate.toLocaleDateString('default', { weekday: 'long' })}
                    </p>
                    <p className="text-slate-500">{monthName} {year}</p>
                  </div>
                </div>

                {/* All-day events */}
                {(() => {
                  const allDay = getEventsForDate(currentDate).filter((e) => e.isFullDay || e.type === 'release');
                  if (!allDay.length) return null;
                  return (
                    <div className="flex flex-wrap gap-2 border-b border-slate-100 bg-slate-50/40 px-6 py-2">
                      {allDay.map((ev) => (
                        <div
                          key={ev.id}
                          onClick={() => openDetail(ev)}
                          className={cn('cursor-pointer rounded-lg px-3 py-1 text-xs font-bold', eventPillClass(ev))}
                        >
                          {ev.title}
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* Scrollable time grid */}
                <div className="overflow-y-auto" style={{ maxHeight: '600px' }}>
                  {HOURS.map((h) => {
                    const isBest = BEST_POST_HOURS.has(h);
                    const hevents = getEventsForDate(currentDate).filter((e) => {
                      if (e.isFullDay || e.type === 'release') return false;
                      const eh = e.time ? parseInt(e.time.split(':')[0], 10) : -1;
                      return eh === h;
                    });
                    return (
                      <div key={h} className="flex">
                        {/* Hour label */}
                        <div className="flex w-16 shrink-0 items-start justify-end border-r border-slate-100 pr-3 pt-2">
                          <span className="text-[10px] font-bold text-slate-400">{formatHour(h)}</span>
                        </div>
                        {/* Content */}
                        <div
                          className={cn(
                            'group relative min-h-[64px] flex-1 cursor-pointer border-b border-slate-50 px-3 py-1.5 transition-colors',
                            isBest ? 'bg-amber-50/40 hover:bg-amber-50' : 'hover:bg-blue-50/20',
                          )}
                          onClick={() => openSlot(toDateStr(currentDate), `${String(h).padStart(2, '0')}:00`)}
                        >
                          {isBest && hevents.length === 0 && (
                            <div className="absolute right-4 top-2 flex items-center gap-1">
                              <Zap className="h-3 w-3 text-amber-400" />
                              <span className="text-[9px] font-bold text-amber-500">Best time</span>
                            </div>
                          )}
                          {hevents.map((ev) => {
                            const typeIcon =
                              ev.type === 'post'    ? <Video className="h-3.5 w-3.5 shrink-0 opacity-60" />
                            : ev.type === 'meeting' ? <Clock className="h-3.5 w-3.5 shrink-0 opacity-60" />
                            : ev.type === 'todo'    ? <CheckSquare className="h-3.5 w-3.5 shrink-0 opacity-60" />
                            : ev.type === 'goal'    ? <Target className="h-3.5 w-3.5 shrink-0 opacity-60" />
                            :                        <CalendarIcon className="h-3.5 w-3.5 shrink-0 opacity-60" />;
                            return (
                              <div
                                key={ev.id}
                                onClick={(e) => { e.stopPropagation(); openDetail(ev); }}
                                className={cn('mb-1.5 flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold', eventPillClass(ev))}
                              >
                                {typeIcon}
                                <span className="flex-1">{ev.time} — {ev.title}</span>
                                {ev.platform && (
                                  <span className="shrink-0 text-[9px] uppercase opacity-60">{ev.platform}</span>
                                )}
                              </div>
                            );
                          })}
                          {hevents.length === 0 && (
                            <Plus className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-300 opacity-0 transition-opacity group-hover:opacity-60" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── Right sidebar ────────────────────────────────────────────── */}
          <div className="space-y-6">
            <CalendarInsightsPanel events={events} currentDate={currentDate} />

            {/* Upcoming events */}
            <div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">Upcoming</h3>
              <div className="space-y-2">
                {upcomingEvents.length === 0 && (
                  <p className="text-xs text-slate-400">No upcoming events.</p>
                )}
                {upcomingEvents.map((event) => {
                  const typeIcon =
                    event.type === 'release' ? <Music className="h-4 w-4" />
                  : event.type === 'post'    ? <Video className="h-4 w-4" />
                  : event.type === 'todo'    ? <CheckSquare className="h-4 w-4" />
                  : event.type === 'goal'    ? <Target className="h-4 w-4" />
                  :                           <Clock className="h-4 w-4" />;
                  const iconBg =
                    event.type === 'release' ? 'bg-blue-100 text-blue-600'
                  : event.type === 'post'    ? 'bg-blue-100 text-blue-600'
                  : event.type === 'todo'    ? 'bg-emerald-100 text-emerald-600'
                  : event.type === 'goal'    ? 'bg-amber-100 text-amber-600'
                  :                           'bg-slate-100 text-slate-600';
                  return (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => openDetail(event)}
                      className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-slate-50"
                    >
                      <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', iconBg)}>
                        {typeIcon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-slate-900">{event.title}</p>
                        <p className="text-[10px] text-slate-400">
                          {event.date}{event.time ? ` · ${event.time}` : ''}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Slot drawer ──────────────────────────────────────────────────── */}
      <CalendarSlotDrawer
        open={slotOpen}
        date={slotDate}
        time={slotTime}
        prefillTitle={slotPrefillTitle}
        prefillType={slotPrefillType}
        onClose={() => setSlotOpen(false)}
        onCreated={() => { setSlotOpen(false); fetchEvents(); }}
      />

      {/* ── Full event creation modal ────────────────────────────────────── */}
      <CalendarEventModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setModalType(undefined); }}
        onSave={fetchEvents}
        initialDate={selectedDate}
        initialType={modalType}
      />

      {/* ── Event detail modal ───────────────────────────────────────────── */}
      {selectedEvent && (
        <CalendarEventDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => { setIsDetailModalOpen(false); setSelectedEvent(null); }}
          event={selectedEvent}
          onDelete={fetchEvents}
          onUpdate={fetchEvents}
        />
      )}
    </div>
  );
}
