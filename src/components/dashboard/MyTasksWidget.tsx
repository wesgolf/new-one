import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowRight, CheckCircle2, Circle, Clock, Plus } from 'lucide-react';
import { format, isPast, isToday, parseISO } from 'date-fns';
import { DashCard } from './DashCard';
import { fetchMyTasks, saveTask } from '../../lib/supabaseData';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import type { TaskRecord } from '../../types/domain';

// ─── Group logic ──────────────────────────────────────────────────────────────

type Group = 'overdue' | 'today' | 'upcoming' | 'none';

function getGroup(task: TaskRecord): Group {
  if (!task.due_date) return 'none';
  const d = parseISO(task.due_date);
  if (isToday(d)) return 'today';
  if (isPast(d)) return 'overdue';
  return 'upcoming';
}

const GROUP_META: Record<Group, { label: string; labelClass: string }> = {
  overdue:  { label: 'Overdue',     labelClass: 'text-red-600' },
  today:    { label: 'Due today',   labelClass: 'text-amber-600' },
  upcoming: { label: 'Upcoming',    labelClass: 'text-text-secondary' },
  none:     { label: 'No due date', labelClass: 'text-text-muted' },
};

const GROUP_ORDER: Group[] = ['overdue', 'today', 'upcoming', 'none'];

// ─── Task row ─────────────────────────────────────────────────────────────────

interface RowProps {
  task: TaskRecord;
  onToggleDone: (task: TaskRecord) => void;
}

function TaskRow({ task, onToggleDone }: RowProps) {
  const group = getGroup(task);
  const isDone = task.status === 'completed';

  return (
    <li className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
      <button
        type="button"
        onClick={() => onToggleDone(task)}
        className={`mt-0.5 shrink-0 transition-colors focus:outline-none ${
          isDone
            ? 'text-green-500'
            : 'text-border hover:text-brand'
        }`}
        aria-label={isDone ? 'Mark incomplete' : 'Mark done'}
      >
        {isDone ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <Circle className="h-4 w-4" />
        )}
      </button>

      <div className="min-w-0 flex-1">
        <p
          className={`text-sm font-medium truncate ${
            isDone ? 'line-through text-text-muted' : 'text-text-primary'
          }`}
        >
          {task.title}
        </p>

        {task.due_date && (
          <p className={`mt-0.5 text-xs ${GROUP_META[group].labelClass}`}>
            {group === 'overdue' && (
              <AlertCircle className="mr-0.5 inline h-3 w-3 -mt-px" />
            )}
            {group === 'today' && (
              <Clock className="mr-0.5 inline h-3 w-3 -mt-px" />
            )}
            {format(parseISO(task.due_date), 'MMM d, h:mm a')}
          </p>
        )}
      </div>

      <span
        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
          task.priority === 'high'
            ? 'bg-amber-50 text-amber-700'
            : 'bg-surface text-text-tertiary'
        }`}
      >
        {task.priority}
      </span>
    </li>
  );
}

// ─── Widget ───────────────────────────────────────────────────────────────────

/** Shown on the dashboard — displays only the current user's tasks. */
export function MyTasksWidget() {
  const { authUser } = useCurrentUser();
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!authUser?.id) return;
    setLoading(true);
    try {
      const rows = await fetchMyTasks(authUser.id);
      setTasks(rows);
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [authUser?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggleDone = useCallback(
    async (task: TaskRecord) => {
      const newStatus = task.status === 'completed' ? 'pending' : 'completed';
      try {
        await saveTask({
          ...task,
          status: newStatus,
          completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
        });
        load();
      } catch {
        /* silent */
      }
    },
    [load]
  );

  // Group into buckets (show only active tasks in widget)
  const activeTasks = tasks.filter((t) => t.status !== 'completed');
  const grouped = GROUP_ORDER.reduce<Record<Group, TaskRecord[]>>(
    (acc, g) => {
      acc[g] = activeTasks.filter((t) => getGroup(t) === g);
      return acc;
    },
    { overdue: [], today: [], upcoming: [], none: [] }
  );

  const overdueCount = grouped.overdue.length;

  return (
    <DashCard
      title="My Tasks"
      action={
        <div className="flex items-center gap-3">
          {overdueCount > 0 && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-600">
              {overdueCount} overdue
            </span>
          )}
          <Link
            to="/tasks"
            className="flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      }
    >
      {loading ? (
        <p className="py-2 text-sm text-text-secondary">Loading tasks…</p>
      ) : activeTasks.length === 0 ? (
        <div className="py-4 text-center">
          <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-green-400" />
          <p className="text-sm text-text-secondary">All caught up!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {GROUP_ORDER.map((group) => {
            const items = grouped[group].slice(0, 5);
            if (items.length === 0) return null;

            return (
              <div key={group}>
                <p
                  className={`mb-2 text-[10px] font-bold uppercase tracking-[0.18em] ${GROUP_META[group].labelClass}`}
                >
                  {GROUP_META[group].label}
                </p>
                <ul className="divide-y divide-border/50">
                  {items.map((task) => (
                    <TaskRow key={task.id} task={task} onToggleDone={handleToggleDone} />
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      <Link
        to="/tasks"
        state={{ openNew: true }}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-2 text-xs font-semibold text-text-tertiary transition-colors hover:border-brand hover:text-brand"
      >
        <Plus className="h-3 w-3" />
        New task
      </Link>
    </DashCard>
  );
}
