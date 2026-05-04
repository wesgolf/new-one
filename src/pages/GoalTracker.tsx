import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, Loader2, Pencil, Plus, Sparkles, Trash2, Wand2 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  describeMetric,
  evaluateGoalComputation,
  evaluateGoalMetric,
  getGoalMetricDefinitions,
  loadGoalMetricSnapshot,
  suggestGoalSetupFromPrompt,
} from '../lib/goalMetrics';
import {
  isGoalFormulaDefinition,
  type GoalFormulaDefinition,
  type GoalFormulaOperator,
  type GoalMetricSnapshot,
} from '../lib/goalFormulaEngine';

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

type TrackingStrategy = 'manual' | 'single_metric' | 'calculated';

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
  tracking_strategy: TrackingStrategy;
  metric_key: string;
  helper_prompt: string;
  formula_operator: GoalFormulaOperator;
  formula_left_metric: string;
  formula_right_metric: string;
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
  tracking_strategy: 'manual',
  metric_key: '',
  helper_prompt: '',
  formula_operator: 'divide',
  formula_left_metric: 'instagram.followers',
  formula_right_metric: 'instagram.following',
  is_timeless: false,
};

const CATEGORY_OPTIONS = ['Streaming', 'Social', 'Live', 'Revenue'];
const PRIORITY_OPTIONS = ['low', 'medium', 'high'];
const TERM_OPTIONS = [
  { value: 'short', label: 'Short term' },
  { value: 'medium', label: 'Medium term' },
  { value: 'long', label: 'Long term' },
];
const GOAL_TYPE_OPTIONS = [
  { value: 'count', label: 'Number target', description: 'Reach a specific count like streams, sales, or signups.' },
  { value: 'milestone', label: 'Milestone', description: 'Complete one clear outcome like finishing a release plan.' },
  { value: 'ratio', label: 'Ratio', description: 'Track a relationship between two metrics like followers ÷ following.' },
  { value: 'custom', label: 'Custom', description: 'Use a calculated metric that is not just a simple count.' },
] as const;
const TRACKING_OPTIONS: Array<{ value: TrackingStrategy; label: string; description: string }> = [
  { value: 'manual', label: 'Manual', description: 'You update progress yourself.' },
  { value: 'single_metric', label: 'Connected metric', description: 'Read one live metric directly from analytics.' },
  { value: 'calculated', label: 'Calculated formula', description: 'Combine two live metrics into one goal.' },
];
const FORMULA_OPERATORS: Array<{ value: GoalFormulaOperator; label: string }> = [
  { value: 'divide', label: 'Divide' },
  { value: 'add', label: 'Add' },
  { value: 'subtract', label: 'Subtract' },
  { value: 'multiply', label: 'Multiply' },
];

function formatGoalType(goalType: string | null) {
  if (!goalType) return 'count';
  return goalType.replace(/_/g, ' ');
}

function formatTrackingMode(mode: string | null) {
  if (!mode) return 'manual';
  if (mode === 'derived') return 'Connected';
  return mode.replace(/_/g, ' ');
}

function getTrackingStrategy(goal: GoalRow | null): TrackingStrategy {
  if (!goal || goal.tracking_mode === 'manual' || !goal.tracking_mode) return 'manual';
  if (isGoalFormulaDefinition(goal.formula)) return 'calculated';
  return 'single_metric';
}

function deriveFormulaFromGoal(goal: GoalRow | null): GoalFormulaDefinition | null {
  if (!goal || !isGoalFormulaDefinition(goal.formula)) return null;
  return goal.formula;
}

function buildFormulaFromForm(form: GoalFormState): GoalFormulaDefinition | null {
  if (form.tracking_strategy !== 'calculated') return null;
  if (!form.formula_left_metric || !form.formula_right_metric) return null;

  const leftMetric = describeMetric(form.formula_left_metric);
  const rightMetric = describeMetric(form.formula_right_metric);

  return {
    version: 1,
    type: 'binary',
    operator: form.formula_operator,
    left: { kind: 'metric', metricId: form.formula_left_metric },
    right: { kind: 'metric', metricId: form.formula_right_metric },
    display_as: form.formula_operator === 'divide' ? 'ratio' : 'number',
    left_label: leftMetric?.label ?? form.formula_left_metric,
    right_label: rightMetric?.label ?? form.formula_right_metric,
  };
}

function GoalEditor({
  open,
  initialValue,
  prefillDate,
  metricSnapshot,
  metricsLoading,
  onClose,
  onSaved,
}: {
  open: boolean;
  initialValue: GoalRow | null;
  prefillDate?: string | null;
  metricSnapshot: GoalMetricSnapshot;
  metricsLoading: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<GoalFormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [helperMessage, setHelperMessage] = useState<string | null>(null);

  const metricDefinitions = useMemo(() => getGoalMetricDefinitions(), []);

  useEffect(() => {
    if (!open) return;

    if (!initialValue) {
      setForm({
        ...DEFAULT_FORM,
        due_by: prefillDate ?? '',
      });
      setHelperMessage(null);
      return;
    }

    const strategy = getTrackingStrategy(initialValue);
    const existingFormula = deriveFormulaFromGoal(initialValue);

    setForm({
      title: initialValue.title ?? '',
      description: initialValue.description ?? '',
      due_by: initialValue.due_by ? initialValue.due_by.slice(0, 10) : '',
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
      tracking_strategy: strategy,
      metric_key: initialValue.metric_key ?? '',
      helper_prompt: '',
      formula_operator: existingFormula?.operator ?? 'divide',
      formula_left_metric: existingFormula?.left.kind === 'metric' ? existingFormula.left.metricId : 'instagram.followers',
      formula_right_metric: existingFormula?.right.kind === 'metric' ? existingFormula.right.metricId : 'instagram.following',
      is_timeless: Boolean(initialValue.is_timeless),
    });
    setHelperMessage(null);
  }, [initialValue, open, prefillDate]);

  const update = <K extends keyof GoalFormState>(key: K, value: GoalFormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const formula = useMemo(() => buildFormulaFromForm(form), [form]);
  const metricPreview = useMemo(() => evaluateGoalMetric(form.metric_key, metricSnapshot), [form.metric_key, metricSnapshot]);
  const calculationPreview = useMemo(
    () => evaluateGoalComputation(form.tracking_strategy, metricSnapshot, form.metric_key, formula),
    [form.tracking_strategy, metricSnapshot, form.metric_key, formula],
  );

  const isMilestoneGoal = form.goal_type === 'milestone';
  const usesLiveMetric = form.tracking_strategy !== 'manual';
  const resolvedCurrent = usesLiveMetric ? calculationPreview.current : Number(form.current || 0);

  const applyHelperSuggestion = () => {
    const suggestion = suggestGoalSetupFromPrompt(form.helper_prompt);
    if (!suggestion) {
      setHelperMessage('No automatic suggestion matched that prompt yet. Try naming the platform and the two metrics.');
      return;
    }

    if (suggestion.strategy === 'single_metric' && suggestion.metricId) {
      setForm((current) => ({
        ...current,
        tracking_strategy: 'single_metric',
        metric_key: suggestion.metricId ?? current.metric_key,
        goal_type: suggestion.goalType ?? current.goal_type,
      }));
    }

    if (suggestion.strategy === 'calculated' && suggestion.formula) {
      setForm((current) => ({
        ...current,
        tracking_strategy: 'calculated',
        goal_type: suggestion.goalType ?? current.goal_type,
        formula_operator: suggestion.formula!.operator,
        formula_left_metric: suggestion.formula!.left.kind === 'metric' ? suggestion.formula!.left.metricId : current.formula_left_metric,
        formula_right_metric: suggestion.formula!.right.kind === 'metric' ? suggestion.formula!.right.metricId : current.formula_right_metric,
      }));
    }

    setHelperMessage(suggestion.helperMessage);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const resolvedGoalType =
        form.goal_type === 'milestone'
          ? 'milestone'
          : form.tracking_strategy === 'calculated'
            ? form.formula_operator === 'divide'
              ? 'ratio'
              : 'custom'
            : form.goal_type;

      const payload = {
        user_id: session?.user?.id ?? null,
        title: form.title.trim(),
        description: form.description.trim() || null,
        due_by: form.is_timeless ? null : (form.due_by ? new Date(form.due_by).toISOString() : null),
        category: form.category,
        is_recurring: form.is_recurring,
        priority: form.priority,
        target: resolvedGoalType === 'milestone' ? 1 : Number(form.target || 0),
        current: resolvedGoalType === 'milestone' ? Number(form.current || 0) : Number(resolvedCurrent || 0),
        term: form.term,
        recurrence_pattern: form.recurrence_pattern || null,
        recurrence_interval: form.recurrence_interval ? Number(form.recurrence_interval) : null,
        status_indicator: form.status_indicator || null,
        goal_type: resolvedGoalType,
        tracking_mode: form.tracking_strategy === 'manual' ? 'manual' : 'derived',
        metric_source:
          form.tracking_strategy === 'single_metric'
            ? form.metric_key.split('.')[0]
            : form.tracking_strategy === 'calculated'
              ? 'formula'
              : null,
        metric_key: form.tracking_strategy === 'single_metric' ? form.metric_key || null : null,
        formula: form.tracking_strategy === 'calculated' ? formula : null,
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-border bg-white shadow-2xl">
        <div className="border-b border-border px-6 py-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-text-tertiary">Goals</p>
          <h2 className="mt-2 text-2xl font-semibold text-text-primary">{initialValue ? 'Edit goal' : 'Create goal'}</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Build manual goals, connect one live metric, or calculate a goal from two real numbers.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-6">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-text-tertiary">Goal title</span>
              <input
                className="input-base"
                value={form.title}
                onChange={(event) => update('title', event.target.value)}
                placeholder="Ex. Keep Instagram followers-to-following ratio above 3:1"
                required
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-text-tertiary">Description</span>
              <textarea
                className="input-base min-h-24 resize-none"
                value={form.description}
                onChange={(event) => update('description', event.target.value)}
                placeholder="What does success look like?"
              />
            </label>

            <div>
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-text-tertiary">Goal type</span>
              <div className="grid gap-3 md:grid-cols-2">
                {GOAL_TYPE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => update('goal_type', option.value)}
                    className={[
                      'rounded-2xl border px-4 py-3 text-left transition',
                      form.goal_type === option.value
                        ? 'border-brand bg-brand-dim'
                        : 'border-border bg-slate-50 hover:border-brand/25 hover:bg-white',
                    ].join(' ')}
                  >
                    <p className="text-sm font-semibold text-text-primary">{option.label}</p>
                    <p className="mt-1 text-xs text-text-secondary">{option.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-slate-50/80 p-4">
              <div className="mb-3">
                <span className="block text-xs font-semibold uppercase tracking-wide text-text-tertiary">Progress tracking</span>
                <p className="mt-1 text-xs text-text-secondary">Choose whether this goal is manual, connected to one metric, or calculated from two metrics.</p>
              </div>
              <div className="grid gap-2 md:grid-cols-3">
                {TRACKING_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => update('tracking_strategy', option.value)}
                    className={[
                      'rounded-2xl border px-4 py-3 text-left transition',
                      form.tracking_strategy === option.value
                        ? 'border-brand bg-white shadow-sm'
                        : 'border-border bg-white/60 hover:border-brand/25',
                    ].join(' ')}
                  >
                    <p className="text-sm font-semibold text-text-primary">{option.label}</p>
                    <p className="mt-1 text-xs text-text-secondary">{option.description}</p>
                  </button>
                ))}
              </div>

              {form.tracking_strategy === 'single_metric' ? (
                <div className="mt-4 space-y-4">
                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-text-tertiary">Metric</span>
                    <select
                      className="input-base"
                      value={form.metric_key}
                      onChange={(event) => update('metric_key', event.target.value)}
                    >
                      <option value="">Select a metric</option>
                      {metricDefinitions.map((metric) => (
                        <option key={metric.id} value={metric.id}>
                          {metric.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-text-secondary">
                    {metricsLoading ? 'Loading live metrics…' : metricPreview.explanation}
                  </div>
                </div>
              ) : null}

              {form.tracking_strategy === 'calculated' ? (
                <div className="mt-4 space-y-4">
                  <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-blue-700">
                      <Wand2 className="h-4 w-4" />
                      Quick formula helper
                    </div>
                    <p className="mt-1 text-xs text-blue-700/80">
                      Describe the goal in plain English, for example “Instagram followers to following ratio”.
                    </p>
                    <div className="mt-3 flex gap-2">
                      <input
                        className="input-base flex-1 bg-white"
                        value={form.helper_prompt}
                        onChange={(event) => update('helper_prompt', event.target.value)}
                        placeholder="Describe the calculation you want"
                      />
                      <button type="button" className="btn-secondary shrink-0" onClick={applyHelperSuggestion}>
                        Suggest
                      </button>
                    </div>
                    {helperMessage ? (
                      <p className="mt-2 text-xs text-blue-700">{helperMessage}</p>
                    ) : null}
                  </div>

                  <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr]">
                    <label className="block">
                      <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-text-tertiary">Left metric</span>
                      <select
                        className="input-base"
                        value={form.formula_left_metric}
                        onChange={(event) => update('formula_left_metric', event.target.value)}
                      >
                        {metricDefinitions.map((metric) => (
                          <option key={metric.id} value={metric.id}>
                            {metric.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-text-tertiary">Operator</span>
                      <select
                        className="input-base min-w-[130px]"
                        value={form.formula_operator}
                        onChange={(event) => update('formula_operator', event.target.value as GoalFormulaOperator)}
                      >
                        {FORMULA_OPERATORS.map((operator) => (
                          <option key={operator.value} value={operator.value}>
                            {operator.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-text-tertiary">Right metric</span>
                      <select
                        className="input-base"
                        value={form.formula_right_metric}
                        onChange={(event) => update('formula_right_metric', event.target.value)}
                      >
                        {metricDefinitions.map((metric) => (
                          <option key={metric.id} value={metric.id}>
                            {metric.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-text-secondary">
                    {metricsLoading ? 'Loading live metrics…' : calculationPreview.explanation}
                  </div>
                </div>
              ) : null}
            </div>

            {!isMilestoneGoal ? (
              <div className="grid gap-4 md:grid-cols-2">
                <label>
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                    {form.tracking_strategy === 'calculated' && form.formula_operator === 'divide' ? 'Target ratio' : 'Target'}
                  </span>
                  <input
                    className="input-base"
                    type="number"
                    step="any"
                    value={form.target}
                    onChange={(event) => update('target', event.target.value)}
                    placeholder={form.tracking_strategy === 'calculated' && form.formula_operator === 'divide' ? '3' : '10000'}
                  />
                </label>

                <label>
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                    {form.tracking_strategy === 'manual' ? 'Current progress' : 'Current value preview'}
                  </span>
                  {form.tracking_strategy === 'manual' ? (
                    <input
                      className="input-base"
                      type="number"
                      step="any"
                      value={form.current}
                      onChange={(event) => update('current', event.target.value)}
                      placeholder="0"
                    />
                  ) : (
                    <div className="rounded-xl border border-border bg-slate-50 px-4 py-3 text-sm text-text-primary">
                      {metricsLoading ? 'Loading live metrics…' : calculationPreview.formatted ?? calculationPreview.explanation}
                    </div>
                  )}
                </label>
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-slate-50 px-4 py-3 text-sm text-text-secondary">
                Milestone goals are treated as one clear outcome. You can mark progress later from the goal card.
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-3">
              <label>
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-text-tertiary">Category</span>
                <select className="input-base" value={form.category} onChange={(event) => update('category', event.target.value)}>
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-text-tertiary">Priority</span>
                <select className="input-base" value={form.priority} onChange={(event) => update('priority', event.target.value)}>
                  {PRIORITY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-text-tertiary">Timeline</span>
                <select className="input-base" value={form.term} onChange={(event) => update('term', event.target.value)}>
                  {TERM_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="rounded-2xl border border-border bg-white p-4">
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={form.is_timeless} onChange={(event) => update('is_timeless', event.target.checked)} />
                <div>
                  <p className="text-sm font-semibold text-text-primary">Ongoing goal</p>
                  <p className="text-xs text-text-secondary">Use this when the goal should stay active without a deadline.</p>
                </div>
              </label>

              {!form.is_timeless ? (
                <label className="mt-4 block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-text-tertiary">Due date</span>
                  <input
                    className="input-base"
                    type="date"
                    value={form.due_by}
                    onChange={(event) => update('due_by', event.target.value)}
                  />
                </label>
              ) : null}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-border bg-white px-6 py-4">
            <div className="text-xs text-text-secondary">
              {metricSnapshot.loadedSources.length > 0
                ? `Live metrics ready from ${metricSnapshot.loadedSources.join(', ')}`
                : 'No live metrics configured yet'}
            </div>
            <div className="flex items-center gap-3">
              <button type="button" className="btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Saving…' : 'Save goal'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export function GoalTracker() {
  const location = useLocation();
  const navigate = useNavigate();
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [metricSnapshot, setMetricSnapshot] = useState<GoalMetricSnapshot>({
    values: {},
    loadedSources: [],
    errors: [],
    fetchedAt: null,
  });
  const [error, setError] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<GoalRow | null>(null);
  const [prefillDate, setPrefillDate] = useState<string | null>(null);

  const loadGoals = useCallback(async () => {
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

  const loadMetrics = useCallback(async () => {
    setMetricsLoading(true);
    try {
      const snapshot = await loadGoalMetricSnapshot();
      setMetricSnapshot(snapshot);
    } finally {
      setMetricsLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.all([loadGoals(), loadMetrics()]);
  }, [loadGoals, loadMetrics]);

  useEffect(() => {
    const routeState = location.state as { openCreate?: boolean; prefillDate?: string } | null;
    if (!routeState?.openCreate) return;

    setEditingGoal(null);
    setPrefillDate(routeState.prefillDate ? routeState.prefillDate.slice(0, 10) : null);
    setEditorOpen(true);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  const goalsWithProgress = useMemo(
    () =>
      goals.map((goal) => {
        const strategy = getTrackingStrategy(goal);
        const formula = deriveFormulaFromGoal(goal);
        const computed = evaluateGoalComputation(strategy, metricSnapshot, goal.metric_key, formula);
        const currentValue = strategy === 'manual' ? goal.current : computed.current ?? goal.current;
        const progress = goal.target > 0 ? Math.min((currentValue / goal.target) * 100, 100) : 0;
        return {
          ...goal,
          currentValue,
          progress,
          computation: computed,
          strategy,
        };
      }),
    [goals, metricSnapshot],
  );

  useEffect(() => {
    if (!metricSnapshot.fetchedAt) return;

    const updates = goalsWithProgress.filter((goal) => {
      if (goal.strategy === 'manual') return false;
      if (goal.computation.current == null) return false;
      return Math.abs((goal.current ?? 0) - goal.computation.current) > 0.0001;
    });

    if (updates.length === 0) return;

    let cancelled = false;
    void (async () => {
      await Promise.allSettled(
        updates.map((goal) =>
          supabase.from('goals').update({
            current: goal.computation.current,
            updated_at: new Date().toISOString(),
          }).eq('id', goal.id),
        ),
      );

      if (cancelled) return;
      setGoals((current) =>
        current.map((goal) => {
          const update = updates.find((candidate) => candidate.id === goal.id);
          return update && update.computation.current != null
            ? { ...goal, current: update.computation.current }
            : goal;
        }),
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [goalsWithProgress, metricSnapshot.fetchedAt]);

  const deleteGoal = async (goalId: string) => {
    const { error } = await supabase.from('goals').delete().eq('id', goalId);
    if (!error) {
      void loadGoals();
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-text-tertiary">Goals</p>
          <h1 className="mt-2 text-4xl font-bold text-text-primary">Goal Tracker</h1>
          <p className="mt-2 max-w-2xl text-text-secondary">
            Track manual goals, connect live metrics, or build formulas like followers ÷ following without writing raw JSON.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-text-secondary">
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1">
              <Activity className="h-3.5 w-3.5" />
              {metricsLoading ? 'Loading live metrics…' : metricSnapshot.loadedSources.length > 0 ? `Live metrics: ${metricSnapshot.loadedSources.join(', ')}` : 'Live metrics unavailable'}
            </span>
            {metricSnapshot.errors[0] ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-amber-700">
                <Sparkles className="h-3.5 w-3.5" />
                {metricSnapshot.errors[0]}
              </span>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            setEditingGoal(null);
            setPrefillDate(null);
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
                  <button type="button" className="rounded-lg p-2 text-text-tertiary hover:bg-slate-100 hover:text-text-primary" onClick={() => { setPrefillDate(null); setEditingGoal(goal); setEditorOpen(true); }}>
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
                    {goal.goal_type === 'ratio'
                      ? `${goal.currentValue.toFixed(2)} : 1 / target ${goal.target || 0} : 1`
                      : `${goal.currentValue.toLocaleString(undefined, { maximumFractionDigits: 2 })} / ${goal.target.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-black transition-all" style={{ width: `${goal.progress}%` }} />
                </div>
                <div className="grid gap-3 text-sm text-text-secondary sm:grid-cols-2">
                  <div>Type: <span className="font-medium capitalize text-text-primary">{formatGoalType(goal.goal_type)}</span></div>
                  <div>Tracking: <span className="font-medium text-text-primary">{formatTrackingMode(goal.tracking_mode)}</span></div>
                  <div>Priority: <span className="font-medium text-text-primary">{goal.priority || 'medium'}</span></div>
                  <div>Term: <span className="font-medium text-text-primary">{goal.term || 'short'}</span></div>
                  <div>Due: <span className="font-medium text-text-primary">{goal.due_by ? new Date(goal.due_by).toLocaleString() : 'None'}</span></div>
                  <div>Metric: <span className="font-medium text-text-primary">{describeMetric(goal.metric_key || '')?.label ?? goal.metric_source ?? 'Manual'}</span></div>
                </div>
                {goal.strategy !== 'manual' ? (
                  <div className="rounded-xl border border-border bg-slate-50 px-4 py-3 text-sm text-text-secondary">
                    <p className="font-medium text-text-primary">Live calculation</p>
                    <p className="mt-1">{goal.computation.explanation}</p>
                  </div>
                ) : null}
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
        prefillDate={prefillDate}
        metricSnapshot={metricSnapshot}
        metricsLoading={metricsLoading}
        onClose={() => {
          setEditorOpen(false);
          setPrefillDate(null);
        }}
        onSaved={() => void Promise.all([loadGoals(), loadMetrics()])}
      />
    </div>
  );
}
