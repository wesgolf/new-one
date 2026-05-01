import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

type GoalRow = {
  id: string;
  title: string;
  description: string | null;
  due_by: string | null;
  category: string | null;
  is_recurring: boolean;
  priority: string | null;
  target: number;
  current: number;
  term: string | null;
  recurrence_pattern: string | null;
  recurrence_interval: number | null;
  status_indicator: string | null;
  goal_type: string | null;
  tracking_mode: string | null;
  metric_source: string | null;
  metric_key: string | null;
  formula: Record<string, any> | null;
  is_timeless: boolean;
  ai_analysis: string | null;
  ai_analysis_run: string | null;
  created_at: string;
  updated_at: string;
};

type GoalFormState = {
  title: string;
  description: string;
  due_by: string;
  category: string;
  is_recurring: boolean;
  priority: string;
  target: string;
  current: string;
  term: string;
  recurrence_pattern: string;
  recurrence_interval: string;
  status_indicator: string;
  goal_type: string;
  tracking_mode: string;
  metric_source: string;
  metric_key: string;
  formula: string;
  is_timeless: boolean;
};

const DEFAULT_FORM: GoalFormState = {
  title: '',
  description: '',
  due_by: '',
  category: 'Streaming',
  is_recurring: false,
  priority: 'medium',
  target: '',
  current: '',
  term: 'short',
  recurrence_pattern: '',
  recurrence_interval: '',
  status_indicator: 'on-track',
  goal_type: 'count',
  tracking_mode: 'manual',
  metric_source: '',
  metric_key: '',
  formula: '',
  is_timeless: false,
};

function GoalEditor({
  open,
  initialValue,
  onClose,
  onSaved,
}: {
  open: boolean;
  initialValue: GoalRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<GoalFormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (!initialValue) {
      setForm(DEFAULT_FORM);
      return;
    }

    setForm({
      title: initialValue.title ?? '',
      description: initialValue.description ?? '',
      due_by: initialValue.due_by ? initialValue.due_by.slice(0, 16) : '',
      category: initialValue.category ?? 'Streaming',
      is_recurring: Boolean(initialValue.is_recurring),
      priority: initialValue.priority ?? 'medium',
      target: String(initialValue.target ?? ''),
      current: String(initialValue.current ?? ''),
      term: initialValue.term ?? 'short',
      recurrence_pattern: initialValue.recurrence_pattern ?? '',
      recurrence_interval: initialValue.recurrence_interval ? String(initialValue.recurrence_interval) : '',
      status_indicator: initialValue.status_indicator ?? 'on-track',
      goal_type: initialValue.goal_type ?? 'count',
      tracking_mode: initialValue.tracking_mode ?? 'manual',
      metric_source: initialValue.metric_source ?? '',
      metric_key: initialValue.metric_key ?? '',
      formula: initialValue.formula ? JSON.stringify(initialValue.formula, null, 2) : '',
      is_timeless: Boolean(initialValue.is_timeless),
    });
  }, [initialValue, open]);

  if (!open) return null;

  const update = <K extends keyof GoalFormState>(key: K, value: GoalFormState[K]) =>
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
        due_by: form.is_timeless ? null : (form.due_by ? new Date(form.due_by).toISOString() : null),
        category: form.category,
        is_recurring: form.is_recurring,
        priority: form.priority,
        target: Number(form.target || 0),
        current: Number(form.current || 0),
        term: form.term,
        recurrence_pattern: form.recurrence_pattern || null,
        recurrence_interval: form.recurrence_interval ? Number(form.recurrence_interval) : null,
        status_indicator: form.status_indicator || null,
        goal_type: form.goal_type,
        tracking_mode: form.tracking_mode,
        metric_source: form.metric_source || null,
        metric_key: form.metric_key || null,
        formula: form.formula.trim() ? JSON.parse(form.formula) : null,
        is_timeless: form.is_timeless,
        updated_at: new Date().toISOString(),
      };

      const query = initialValue
        ? supabase.from('goals').update(payload).eq('id', initialValue.id)
        : supabase.from('goals').insert([payload]);

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
      <div className="w-full max-w-2xl rounded-3xl border border-border bg-white shadow-2xl">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-xl font-semibold text-text-primary">{initialValue ? 'Edit goal' : 'New goal'}</h2>
        </div>
        <form onSubmit={handleSubmit} className="grid gap-4 p-6 md:grid-cols-2">
          <label className="md:col-span-2">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-text-tertiary">Title</span>
            <input className="input-base" value={form.title} onChange={(event) => update('title', event.target.value)} required />
          </label>
          <label className="md:col-span-2">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-text-tertiary">Description</span>
            <textarea className="input-base min-h-24 resize-none" value={form.description} onChange={(event) => update('description', event.target.value)} />
          </label>
          <label>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-text-tertiary">Target</span>
            <input className="input-base" type="number" value={form.target} onChange={(event) => update('target', event.target.value)} />
          </label>
          <label>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-text-tertiary">Current</span>
            <input className="input-base" type="number" value={form.current} onChange={(event) => update('current', event.target.value)} />
          </label>
          <label>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-text-tertiary">Category</span>
            <input className="input-base" value={form.category} onChange={(event) => update('category', event.target.value)} />
          </label>
          <label>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-text-tertiary">Priority</span>
            <select className="input-base" value={form.priority} onChange={(event) => update('priority', event.target.value)}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>
          <label>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-text-tertiary">Goal Type</span>
            <select className="input-base" value={form.goal_type} onChange={(event) => update('goal_type', event.target.value)}>
              <option value="count">Count</option>
              <option value="ratio">Ratio</option>
              <option value="milestone">Milestone</option>
              <option value="custom">Custom</option>
            </select>
          </label>
          <label>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-text-tertiary">Tracking</span>
            <select className="input-base" value={form.tracking_mode} onChange={(event) => update('tracking_mode', event.target.value)}>
              <option value="manual">Manual</option>
              <option value="derived">Derived</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </label>
          <label>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-text-tertiary">Due By</span>
            <input className="input-base" type="datetime-local" value={form.due_by} onChange={(event) => update('due_by', event.target.value)} disabled={form.is_timeless} />
          </label>
          <label className="flex items-end gap-3">
            <input type="checkbox" checked={form.is_timeless} onChange={(event) => update('is_timeless', event.target.checked)} />
            <span className="pb-3 text-sm text-text-secondary">Timeless goal</span>
          </label>
          <label>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-text-tertiary">Metric Source</span>
            <input className="input-base" value={form.metric_source} onChange={(event) => update('metric_source', event.target.value)} />
          </label>
          <label>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-text-tertiary">Metric Key</span>
            <input className="input-base" value={form.metric_key} onChange={(event) => update('metric_key', event.target.value)} />
          </label>
          <label className="md:col-span-2">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-text-tertiary">Formula JSON</span>
            <textarea className="input-base min-h-28 font-mono text-xs" value={form.formula} onChange={(event) => update('formula', event.target.value)} />
          </label>
          <div className="md:col-span-2 flex items-center justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function GoalTracker() {
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<GoalRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) {
        setGoals([]);
        return;
      }

      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setGoals((data ?? []) as GoalRow[]);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load goals');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const deleteGoal = async (goalId: string) => {
    const { error } = await supabase.from('goals').delete().eq('id', goalId);
    if (!error) {
      void load();
    }
  };

  const goalsWithProgress = useMemo(
    () =>
      goals.map((goal) => {
        const progress = goal.target > 0 ? Math.min((goal.current / goal.target) * 100, 100) : 0;
        return { ...goal, progress };
      }),
    [goals],
  );

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-text-tertiary">Goals</p>
          <h1 className="mt-2 text-4xl font-bold text-text-primary">Goal Tracker</h1>
          <p className="mt-2 max-w-2xl text-text-secondary">
            This page now reads and writes the new `goals` table directly.
          </p>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            setEditingGoal(null);
            setEditorOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          New goal
        </button>
      </header>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-text-tertiary" />
        </div>
      ) : goalsWithProgress.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-white px-6 py-16 text-center text-text-secondary">
          No goals yet.
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {goalsWithProgress.map((goal) => (
            <article key={goal.id} className="rounded-2xl border border-border bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-semibold text-text-primary">{goal.title}</h2>
                    {goal.status_indicator && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
                        {goal.status_indicator}
                      </span>
                    )}
                  </div>
                  {goal.description && <p className="mt-2 text-sm text-text-secondary">{goal.description}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" className="rounded-lg p-2 text-text-tertiary hover:bg-slate-100 hover:text-text-primary" onClick={() => { setEditingGoal(goal); setEditorOpen(true); }}>
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button type="button" className="rounded-lg p-2 text-text-tertiary hover:bg-rose-50 hover:text-rose-600" onClick={() => void deleteGoal(goal.id)}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">Progress</span>
                  <span className="font-medium text-text-primary">
                    {goal.current} / {goal.target}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-black transition-all" style={{ width: `${goal.progress}%` }} />
                </div>
                <div className="grid gap-3 text-sm text-text-secondary sm:grid-cols-2">
                  <div>Type: <span className="font-medium text-text-primary">{goal.goal_type || 'count'}</span></div>
                  <div>Tracking: <span className="font-medium text-text-primary">{goal.tracking_mode || 'manual'}</span></div>
                  <div>Priority: <span className="font-medium text-text-primary">{goal.priority || 'medium'}</span></div>
                  <div>Term: <span className="font-medium text-text-primary">{goal.term || 'short'}</span></div>
                  <div>Due: <span className="font-medium text-text-primary">{goal.due_by ? new Date(goal.due_by).toLocaleString() : 'None'}</span></div>
                  <div>Metric: <span className="font-medium text-text-primary">{goal.metric_source || goal.metric_key || 'Manual'}</span></div>
                </div>
                {goal.ai_analysis && (
                  <div className="rounded-xl border border-border bg-slate-50 px-4 py-3 text-sm text-text-secondary">
                    <p className="font-medium text-text-primary">AI analysis</p>
                    <p className="mt-1">{goal.ai_analysis}</p>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      <GoalEditor
        open={editorOpen}
        initialValue={editingGoal}
        onClose={() => setEditorOpen(false)}
        onSaved={() => void load()}
      />
    </div>
  );
}
