/**
 * calendarMapping — converts domain records into calendar-renderable events.
 *
 * The CalendarEvent shape mirrors the internal Event interface used by
 * src/pages/Calendar.tsx so tasks, releases, shows, etc. can all flow into
 * the same calendar renderer without coupling the domain layer to the view.
 *
 * Usage:
 *   import { taskToCalendarEvent, tasksToCalendarEvents } from '../lib/calendarMapping';
 *   const events = tasksToCalendarEvents(myTasks);
 */

import { format, parseISO } from 'date-fns';
import type { TaskRecord } from '../types/domain';

// ─── Shared event shape ───────────────────────────────────────────────────────

export type CalendarEventType = 'post' | 'release' | 'show' | 'meeting' | 'todo' | 'goal';

export interface CalendarEvent {
  id: string;
  title: string;
  /** YYYY-MM-DD */
  date: string;
  /** HH:mm (24-hour) */
  time?: string;
  type: CalendarEventType;
  priority?: 'low' | 'medium' | 'high';
  status?: string;
  /** Original record id for deep linking */
  sourceId?: string;
  sourceType?: 'task' | 'release' | 'show' | 'meeting' | 'content';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Map 'urgent' → 'high' so the calendar priority palette stays consistent. */
function normalisePriority(p?: string | null): 'low' | 'medium' | 'high' {
  if (p === 'urgent') return 'high';
  if (p === 'high' || p === 'medium' || p === 'low') return p;
  return 'medium';
}

// ─── Task converters ──────────────────────────────────────────────────────────

/**
 * Convert a single TaskRecord to a CalendarEvent.
 * Returns null when the task has no due_date — nothing to show on a calendar.
 */
export function taskToCalendarEvent(task: TaskRecord): CalendarEvent | null {
  if (!task.due_date) return null;

  const parsed = parseISO(task.due_date);
  return {
    id: `task_${task.id}`,
    title: task.title,
    date: format(parsed, 'yyyy-MM-dd'),
    time: format(parsed, 'HH:mm'),
    type: 'todo',
    priority: normalisePriority(task.priority),
    status: task.status,
    sourceId: task.id,
    sourceType: 'task',
  };
}

/**
 * Convert an array of TaskRecords to CalendarEvents.
 * Tasks without a due_date are silently skipped.
 *
 * @param tasks         - raw task records
 * @param includeCompleted - set true to also include done/blocked tasks (default false)
 */
export function tasksToCalendarEvents(
  tasks: TaskRecord[],
  { includeCompleted = false }: { includeCompleted?: boolean } = {}
): CalendarEvent[] {
  return tasks
    .filter((t) => includeCompleted || (t.status !== 'done' && t.status !== 'blocked'))
    .map(taskToCalendarEvent)
    .filter((e): e is CalendarEvent => e !== null);
}
