import React, { useEffect, useMemo, useState } from 'react';
import { addDays, format, isSameDay, parseISO, startOfWeek } from 'date-fns';
import { Bot, CalendarPlus, ChevronLeft, ChevronRight, Lightbulb, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { parseAssistantIntent } from '../lib/assistantActions';
import { subscribeAssistantActions } from '../lib/commandBus';
import { fetchGoals, fetchTasks, safeSelect, saveGoal, saveTask } from '../lib/supabaseData';
import { supabase } from '../lib/supabase';
import type { GoalRecord, TaskRecord } from '../types/domain';

type PlannerItemType = 'task' | 'scheduled_post' | 'goal' | 'custom_event';

interface PlannerItem {
  id: string;
  title: string;
  startsAt: string;
  type: PlannerItemType;
  platform?: string | null;
  status?: string | null;
}

const HOURS = Array.from({ length: 15 }, (_, index) => index + 8);
const BEST_TIMES = [
  { weekday: 1, hour: 11, label: 'IG window' },
  { weekday: 3, hour: 18, label: 'TikTok lift' },
  { weekday: 5, hour: 19, label: 'Weekend warmup' },
];

function toLocalInputValue(dateIso: string) {
  return new Date(dateIso).toISOString().slice(0, 16);
}

export function Calendar() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'week' | 'day'>('week');
  const [items, setItems] = useState<PlannerItem[]>([]);
  const [goals, setGoals] = useState<GoalRecord[]>([]);
  const [taskRows, setTaskRows] = useState<TaskRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [assistantInput, setAssistantInput] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [draftType, setDraftType] = useState<PlannerItemType | null>(null);
  const [draftDate, setDraftDate] = useState(new Date().toISOString());
  const [draftTitle, setDraftTitle] = useState('');
  const [editingItem, setEditingItem] = useState<PlannerItem | null>(null);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const visibleDays = view === 'week' ? Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)) : [currentDate];

  const load = async () => {
    setLoading(true);
    try {
      const [tasks, content, meetings, goalRows] = await Promise.all([
        fetchTasks(),
        safeSelect<any>('content_items', 'scheduled_date', true),
        safeSelect<any>('meetings', 'date', true),
        fetchGoals(),
      ]);

      setTaskRows(tasks);
      setGoals(goalRows);

      const mapped: PlannerItem[] = [
        ...tasks
          .filter((task) => task.due_date)
          .map((task) => ({
            id: task.id,
            title: task.title,
            startsAt: task.due_date!,
            type: 'task' as const,
            status: task.status,
          })),
        ...content
          .filter((item) => item.scheduled_date)
          .map((item) => ({
            id: item.id,
            title: item.title,
            startsAt: item.scheduled_date,
            type: 'scheduled_post' as const,
            platform: item.platform,
            status: item.status,
          })),
        ...meetings
          .filter((meeting) => meeting.date)
          .map((meeting) => ({
            id: meeting.id,
            title: meeting.title,
            startsAt: meeting.time ? `${meeting.date}T${meeting.time}` : `${meeting.date}T12:00:00`,
            type: 'custom_event' as const,
            status: meeting.priority,
          })),
        ...goalRows
          .filter((goal) => goal.end_date)
          .map((goal) => ({
            id: goal.id,
            title: goal.title,
            startsAt: goal.end_date!,
            type: 'goal' as const,
          })),
      ];

      setItems(mapped);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    return subscribeAssistantActions((action) => {
      if (action.type === 'create_calendar_event') {
        setDraftType('custom_event');
        setDraftDate(action.payload?.startsAt || new Date().toISOString());
        setDraftTitle(action.payload?.title || '');
        setModalOpen(true);
      }
      if (action.type === 'open_content_scheduler') {
        navigate(`/content?scheduledAt=${encodeURIComponent(action.payload?.startsAt || new Date().toISOString())}`);
      }
    });
  }, [navigate]);

  const insights = useMemo(() => {
    const counts = visibleDays.map((day) => ({
      date: day,
      count: items.filter((item) => isSameDay(parseISO(item.startsAt), day)).length,
      posts: items.filter((item) => item.type === 'scheduled_post' && isSameDay(parseISO(item.startsAt), day)).length,
    }));

    const busyDay = counts.sort((a, b) => b.count - a.count)[0];
    const deadZones = visibleDays
      .filter((day) => items.filter((item) => isSameDay(parseISO(item.startsAt), day)).length === 0)
      .map((day) => format(day, 'EEE'));
    const conflicts = counts.filter((day) => day.count >= 4).length;

    return {
      busyDay: busyDay?.count ? `${format(busyDay.date, 'EEEE')} (${busyDay.count} items)` : 'No busy days yet',
      contentDensity: counts.reduce((sum, day) => sum + day.posts, 0),
      deadZones: deadZones.length ? deadZones.join(', ') : 'No dead zones',
      conflicts,
      opportunities: BEST_TIMES.filter((slot) =>
        !items.some((item) => {
          const start = parseISO(item.startsAt);
          return start.getDay() === slot.weekday && start.getHours() === slot.hour;
        })
      ).length,
    };
  }, [items, visibleDays]);

  const itemsForDayAndHour = (day: Date, hour: number) =>
    items.filter((item) => {
      const start = parseISO(item.startsAt);
      return isSameDay(start, day) && start.getHours() === hour;
    });

  const bestTimeForDayHour = (day: Date, hour: number) =>
    BEST_TIMES.find((slot) => slot.weekday === day.getDay() && slot.hour === hour);

  const createFromSlot = (day: Date, hour: number) => {
    const slot = new Date(day);
    slot.setHours(hour, 0, 0, 0);
    setDraftDate(slot.toISOString());
    setDraftType(null);
    setDraftTitle('');
    setEditingItem(null);
    setModalOpen(true);
  };

  const saveDraft = async () => {
    if (!draftType || !draftTitle.trim()) return;

    if (draftType === 'scheduled_post') {
      navigate(`/content?scheduledAt=${encodeURIComponent(draftDate)}&title=${encodeURIComponent(draftTitle)}`);
      setModalOpen(false);
      return;
    }

    if (draftType === 'task') {
      const existingTask = editingItem?.type === 'task' ? taskRows.find((task) => task.id === editingItem.id) : null;
      await saveTask({
        ...(existingTask || {}),
        id: editingItem?.type === 'task' ? editingItem.id : undefined,
        title: draftTitle,
        due_date: draftDate,
        status: existingTask?.status || 'todo',
        priority: existingTask?.priority || 'medium',
      });
    }

    if (draftType === 'goal') {
      const existingGoal = editingItem?.type === 'goal' ? goals.find((goal) => goal.id === editingItem.id) : null;
      await saveGoal({
        ...(existingGoal || {}),
        id: editingItem?.type === 'goal' ? editingItem.id : undefined,
        title: draftTitle,
        tracking_mode: 'manual',
        goal_type: 'milestone',
        end_date: draftDate,
      });
    }

    if (draftType === 'custom_event') {
      const date = new Date(draftDate);
      if (editingItem?.type === 'custom_event') {
        await supabase
          .from('meetings')
          .update({
            title: draftTitle,
            date: format(date, 'yyyy-MM-dd'),
            time: format(date, 'HH:mm'),
          })
          .eq('id', editingItem.id);
      } else {
        await supabase.from('meetings').insert([
          {
            title: draftTitle,
            date: format(date, 'yyyy-MM-dd'),
            time: format(date, 'HH:mm'),
            notes: '',
          },
        ]);
      }
    }

    setModalOpen(false);
    setEditingItem(null);
    await load();
  };

  const handleAssistantSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!assistantInput.trim()) return;
    const parsed = parseAssistantIntent(assistantInput, 'calendar');
    const first = parsed.actions[0];
    if (first?.type === 'create_calendar_event') {
      setDraftType('custom_event');
      setDraftDate(first.payload?.startsAt || new Date().toISOString());
      setDraftTitle(first.payload?.title || assistantInput);
      setModalOpen(true);
    } else if (first?.type === 'open_content_scheduler') {
      navigate(`/content?scheduledAt=${encodeURIComponent(first.payload?.startsAt || new Date().toISOString())}&title=${encodeURIComponent(assistantInput)}`);
    }
    setAssistantInput('');
  };

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-text-tertiary">Operational planner</p>
          <h1 className="mt-2 text-4xl font-bold text-text-primary">Calendar</h1>
          <p className="mt-2 max-w-3xl text-text-secondary">
            Blank slots are clickable, tasks render directly in the grid, scheduled content shows beside custom events, and best posting times stay visible without clutter.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-full border border-border bg-white p-1 shadow-sm">
            {(['week', 'day'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setView(option)}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${view === option ? 'bg-slate-950 text-white' : 'text-text-secondary'}`}
              >
                {option}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setCurrentDate(addDays(currentDate, view === 'week' ? -7 : -1))} className="btn-secondary">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => setCurrentDate(addDays(currentDate, view === 'week' ? 7 : 1))} className="btn-secondary">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </header>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="overflow-hidden rounded-[2rem] border border-border bg-white shadow-sm">
          <div className="grid border-b border-border" style={{ gridTemplateColumns: `90px repeat(${visibleDays.length}, minmax(0, 1fr))` }}>
            <div className="border-r border-border px-4 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">Time</div>
            {visibleDays.map((day) => (
              <div key={day.toISOString()} className="border-r border-border px-4 py-4 last:border-r-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">{format(day, 'EEE')}</p>
                <p className="mt-1 text-lg font-semibold text-text-primary">{format(day, 'MMM d')}</p>
              </div>
            ))}
          </div>

          {loading ? (
            <div className="p-6 text-sm text-text-secondary">Loading calendar...</div>
          ) : (
            <div>
              {HOURS.map((hour) => (
                <div key={hour} className="grid min-h-20 border-b border-border last:border-b-0" style={{ gridTemplateColumns: `90px repeat(${visibleDays.length}, minmax(0, 1fr))` }}>
                  <div className="border-r border-border px-4 py-4 text-sm font-medium text-text-secondary">{format(new Date().setHours(hour, 0, 0, 0), 'h a')}</div>
                  {visibleDays.map((day) => {
                    const slotItems = itemsForDayAndHour(day, hour);
                    const bestTime = bestTimeForDayHour(day, hour);
                    return (
                      <button
                        key={`${day.toISOString()}-${hour}`}
                        type="button"
                        onClick={() => createFromSlot(day, hour)}
                        className="relative border-r border-border px-2 py-2 text-left last:border-r-0 hover:bg-slate-50"
                      >
                        {bestTime && (
                          <div className="mb-2 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-700">
                            {bestTime.label}
                          </div>
                        )}
                        <div className="space-y-2">
                          {slotItems.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setEditingItem(item);
                                setDraftType(item.type);
                                setDraftTitle(item.title);
                                setDraftDate(item.startsAt);
                                setModalOpen(true);
                              }}
                              className={`rounded-2xl px-3 py-2 text-xs font-semibold ${item.type === 'scheduled_post' ? 'bg-blue-50 text-blue-700' : item.type === 'task' ? 'bg-amber-50 text-amber-800' : item.type === 'goal' ? 'bg-purple-50 text-purple-700' : 'bg-slate-100 text-slate-700'}`}
                            >
                              <div>{item.title}</div>
                              <div className="mt-1 text-[10px] uppercase tracking-[0.14em] opacity-80">{item.type === 'scheduled_post' ? item.platform || 'Post' : item.type.replace('_', ' ')}</div>
                            </button>
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-[2rem] border border-border bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-text-tertiary" />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">Insights</p>
                <h2 className="mt-1 text-2xl font-bold text-text-primary">Planner signals</h2>
              </div>
            </div>
            <div className="mt-5 grid gap-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-text-tertiary">Busy day</p>
                <p className="mt-2 font-semibold text-text-primary">{insights.busyDay}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-text-tertiary">Content density</p>
                <p className="mt-2 font-semibold text-text-primary">{insights.contentDensity} scheduled posts</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-text-tertiary">Dead zones</p>
                <p className="mt-2 font-semibold text-text-primary">{insights.deadZones}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-text-tertiary">Conflicts</p>
                <p className="mt-2 font-semibold text-text-primary">{insights.conflicts}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-text-tertiary">Posting opportunities</p>
                <p className="mt-2 font-semibold text-text-primary">{insights.opportunities}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-border bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-text-tertiary" />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">AI event assistant</p>
                <h2 className="mt-1 text-2xl font-bold text-text-primary">Structured parser</h2>
              </div>
            </div>
            <form onSubmit={handleAssistantSubmit} className="mt-5 space-y-3">
              <textarea
                value={assistantInput}
                onChange={(event) => setAssistantInput(event.target.value)}
                placeholder='Try "book studio Friday 2pm" or "schedule teaser reel next Wednesday at 6".'
                className="min-h-28 w-full rounded-2xl border border-border bg-slate-50 px-4 py-3 text-sm text-text-primary outline-none"
              />
              <button type="submit" className="btn-primary">
                <Sparkles className="h-4 w-4" />
                Parse intent
              </button>
            </form>
          </div>
        </div>
      </section>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-[2rem] border border-border bg-white p-6 shadow-2xl">
            <div className="mb-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">Create from slot</p>
              <h3 className="mt-2 text-2xl font-bold text-text-primary">Choose event type</h3>
              <p className="mt-2 text-sm text-text-secondary">{format(parseISO(draftDate), 'EEEE, MMM d • h:mm a')}</p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {[
                { type: 'custom_event', label: 'Custom event' },
                { type: 'task', label: 'Task' },
                { type: 'scheduled_post', label: 'Scheduled post' },
                { type: 'goal', label: 'Goal milestone' },
              ].map((option) => (
                <button
                  key={option.type}
                  type="button"
                  onClick={() => setDraftType(option.type as PlannerItemType)}
                  className={`rounded-2xl border px-4 py-4 text-left ${draftType === option.type ? 'border-slate-950 bg-slate-950 text-white' : 'border-border bg-slate-50 text-text-primary'}`}
                >
                  <span className="font-semibold">{option.label}</span>
                </button>
              ))}
            </div>

            {draftType && (
              <div className="mt-5 space-y-4">
                <input className="input-base" placeholder="Title" value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} />
                <input type="datetime-local" className="input-base" value={toLocalInputValue(draftDate)} onChange={(event) => setDraftDate(new Date(event.target.value).toISOString())} />
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button type="button" className="btn-primary" disabled={!draftType || !draftTitle.trim()} onClick={saveDraft}>
                <CalendarPlus className="h-4 w-4" />
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
