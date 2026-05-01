import React, { useState, useEffect } from 'react';
import {
  Target,
  TrendingUp,
  Plus,
  Zap,
  ArrowUpRight,
  MoreVertical,
  Sparkles,
  Loader2,
  Trash2,
  Edit2,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Activity,
  CheckSquare,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Goal, GoalEntry } from '../types';
import { supabase } from '../lib/supabase';
import { GoalModal } from './GoalModal';
import { calculateGoalPace } from '../engine/growth';
import { fetchServerJsonWithFallback } from '../lib/serverApi';

interface GoalsTrackerProps {
  onAction?: (msg: string) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function effectiveTrackingMode(goal: Goal): 'manual' | 'automatic' | 'hybrid' {
  if (goal.tracking_mode) return goal.tracking_mode as 'manual' | 'automatic' | 'hybrid';
  return goal.manual_progress ? 'manual' : 'automatic';
}

function normalizeGoalEntries(value: unknown, goalId: string): GoalEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry, index) => {
      if (!entry || typeof entry !== 'object') return null;
      const raw = entry as Record<string, unknown>;
      const recordedAt =
        typeof raw.recorded_at === 'string'
          ? raw.recorded_at
          : typeof raw.created_at === 'string'
          ? raw.created_at
          : null;
      const valueNum = Number(raw.value);
      if (!recordedAt || Number.isNaN(valueNum)) return null;
      return {
        id: typeof raw.id === 'string' ? raw.id : `${goalId}-${index}`,
        goal_id: typeof raw.goal_id === 'string' ? raw.goal_id : goalId,
        value: valueNum,
        note: typeof raw.note === 'string' ? raw.note : undefined,
        created_by: typeof raw.created_by === 'string' ? raw.created_by : undefined,
        recorded_at: recordedAt,
        created_at: typeof raw.created_at === 'string' ? raw.created_at : recordedAt,
      } as GoalEntry;
    })
    .filter((entry): entry is GoalEntry => Boolean(entry))
    .sort((a, b) => new Date(b.recorded_at ?? b.created_at ?? 0).getTime() - new Date(a.recorded_at ?? a.created_at ?? 0).getTime());
}

const TRACKING_BADGE: Record<string, { bg: string; label: string }> = {
  manual:    { bg: 'bg-slate-100 text-slate-600',    label: 'Manual'    },
  automatic: { bg: 'bg-emerald-100 text-emerald-700', label: 'Auto'      },
  hybrid:    { bg: 'bg-blue-100 text-blue-700',       label: 'Hybrid'    },
};

const TYPE_BADGE: Record<string, { bg: string; label: string }> = {
  count:     { bg: 'bg-slate-50 text-slate-500',   label: 'Count'     },
  ratio:     { bg: 'bg-blue-50 text-blue-600', label: 'Ratio'     },
  milestone: { bg: 'bg-amber-50 text-amber-600',   label: 'Milestone' },
  custom:    { bg: 'bg-rose-50 text-rose-500',     label: 'Custom'    },
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function GoalsTrackerComponent({ onAction }: GoalsTrackerProps) {
  const [goals,       setGoals]       = useState<Goal[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [analysis,    setAnalysis]    = useState<string | null>(null);
  const [analyzing,   setAnalyzing]   = useState(false);
  const [showMenu,    setShowMenu]    = useState<string | null>(null);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalStatuses,  setGoalStatuses]  = useState<Record<string, { status: string; reasoning: string }>>({});

  // Inline entry logging
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null);
  const [entryHistory,   setEntryHistory]   = useState<Record<string, GoalEntry[]>>({});
  const [logValue,       setLogValue]       = useState('');
  const [logDenominator, setLogDenominator] = useState('');
  const [logNote,        setLogNote]        = useState('');
  const [logging,        setLogging]        = useState(false);

  useEffect(() => { fetchGoals(); }, []);

  // ── Data ──────────────────────────────────────────────────────────────────

  const fetchGoals = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) {
        setGoals(data);
        const history = Object.fromEntries(
          data.map((goal) => [goal.id, normalizeGoalEntries(goal.breakdown, goal.id)]),
        );
        setEntryHistory(history);
      }
    } catch (err) {
      console.error('Failed to fetch goals:', err);
    }
    setLoading(false);
  };

  const fetchEntries = async (goalId: string) => {
    const goal = goals.find((item) => item.id === goalId);
    setEntryHistory(prev => ({
      ...prev,
      [goalId]: normalizeGoalEntries(goal?.breakdown, goalId).slice(0, 8),
    }));
  };

  const toggleExpand = (goalId: string) => {
    if (expandedGoalId === goalId) {
      setExpandedGoalId(null);
    } else {
      setExpandedGoalId(goalId);
      fetchEntries(goalId);
      setLogValue('');
      setLogDenominator('');
      setLogNote('');
    }
  };

  // ── Progress logging ──────────────────────────────────────────────────────

  const logProgress = async (goal: Goal) => {
    if (!logValue) return;
    setLogging(true);

    const { data: { user } } = await supabase.auth.getUser();
    const isRatio = goal.goal_type === 'ratio';

    let value: number;
    if (isRatio && logDenominator) {
      const num = parseFloat(logValue);
      const den = parseFloat(logDenominator);
      value = den > 0 ? parseFloat((num / den).toFixed(4)) : num;
    } else {
      value = parseFloat(logValue);
    }

    if (isNaN(value)) { setLogging(false); return; }

    const newEntry: GoalEntry = {
      id: crypto.randomUUID(),
      goal_id: goal.id,
      value,
      note: logNote.trim() || undefined,
      created_by: user?.id ?? undefined,
      recorded_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    const nextBreakdown = [newEntry, ...normalizeGoalEntries(goal.breakdown, goal.id)];

    const { error: goalError } = await supabase
      .from('goals')
      .update({
        current: value,
        breakdown: nextBreakdown,
        updated_at: new Date().toISOString(),
      })
      .eq('id', goal.id);

    if (!goalError) {
      setGoals(gs => gs.map(g => g.id === goal.id ? { ...g, current: value, breakdown: nextBreakdown } : g));
      setEntryHistory(prev => ({ ...prev, [goal.id]: nextBreakdown.slice(0, 8) }));
      setLogValue('');
      setLogDenominator('');
      setLogNote('');
      onAction?.('Progress logged');
    } else {
      console.error('Failed to log entry:', goalError);
    }
    setLogging(false);
  };

  // AI writes directly to goals.current (no entry history — that's fine for auto mode)
  const updateGoalProgress = async (id: string, newProgress: number) => {
    const { error } = await supabase
      .from('goals')
      .update({ current: newProgress, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (!error) setGoals(gs => gs.map(g => g.id === id ? { ...g, current: newProgress } : g));
  };

  const deleteGoal = async (id: string) => {
    const { error } = await supabase.from('goals').delete().eq('id', id);
    if (!error) {
      setGoals(gs => gs.filter(g => g.id !== id));
      onAction?.('Goal deleted');
    }
    setShowMenu(null);
  };

  // ── AI analysis ───────────────────────────────────────────────────────────

  const runAIAnalysis = async () => {
    if (goals.length === 0) return;
    setAnalyzing(true);
    try {
      const currentDate = new Date().toISOString().split('T')[0];
      const { data: shows } = await supabase.from('shows').select('*');

      const { statuses, analysis } = await fetchServerJsonWithFallback<{
        statuses?: Record<string, { status: string; reasoning: string; current?: number }>;
        analysis?: string;
      }>(
        '/api/goals/analyze',
        'goals-analyze',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            currentDate,
            shows: shows?.slice(0, 5) ?? [],
            goals: goals.map((g) => ({
              id:          g.id,
              title:       g.title,
              goal_type:   g.goal_type ?? 'count',
              target:      g.target,
              current:     g.current,
              unit:        g.unit,
              deadline:    g.deadline,
              is_timeless: g.is_timeless,
            })),
          }),
        },
      );

      if (statuses) {
        setGoalStatuses(statuses);
        for (const goalId in statuses) {
          const goal = goals.find((g) => g.id === goalId);
          if (goal && effectiveTrackingMode(goal) !== 'manual' && statuses[goalId]?.current !== undefined) {
            await updateGoalProgress(goalId, statuses[goalId].current);
          }
        }
      }
      setAnalysis(analysis ?? 'Keep pushing towards your targets!');
    } catch (err) {
      console.error('AI Analysis failed:', err);
      setAnalysis('Focus on short-term social goals to build momentum for your streaming targets.');
    }
    setAnalyzing(false);
  };

  // ── Render helpers ────────────────────────────────────────────────────────

  const renderProgressDisplay = (goal: Goal) => {
    const isRatio     = goal.goal_type === 'ratio';
    const isMilestone = goal.goal_type === 'milestone';

    if (isMilestone) {
      return (
        <div className="flex items-center gap-2">
          <CheckSquare className={cn('w-4 h-4', goal.current >= 1 ? 'text-emerald-500' : 'text-slate-300')} />
          <span className={cn('text-xs font-bold', goal.current >= 1 ? 'text-emerald-600' : 'text-slate-400')}>
            {goal.current >= 1 ? 'Achieved ' : 'In progress'}
          </span>
        </div>
      );
    }

    if (isRatio) {
      const formula    = (goal.formula as any) ?? {};
      const targetText = goal.target > 0 ? ` · target ${goal.target.toFixed(1)}:1` : '';
      return (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-base font-bold text-slate-900 tabular-nums">
              {goal.current.toFixed(3)} : 1
            </span>
            <span className="text-slate-400 text-[10px]">{targetText}</span>
          </div>
          {goal.target > 0 && (
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={cn('h-full transition-all duration-700', goal.current >= goal.target ? 'bg-emerald-500' : 'bg-blue-500')}
                style={{ width: `${Math.min((goal.current / goal.target) * 100, 100)}%` }}
              />
            </div>
          )}
          {formula.numerator_label && (
            <p className="text-[10px] text-slate-400">
              {formula.numerator_label} ÷ {formula.denominator_label || 'denominator'}
            </p>
          )}
        </div>
      );
    }

    // Count / custom
    const progress = goal.target > 0 ? Math.min((goal.current / goal.target) * 100, 100) : 0;
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400 font-medium">
            {goal.current.toLocaleString()} / {goal.target.toLocaleString()} {goal.unit}
          </span>
          <span className={cn('text-xs font-bold', progress >= 75 ? 'text-emerald-600' : 'text-blue-600')}>
            {progress.toFixed(0)}%
          </span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={cn('h-full transition-all duration-700', progress >= 75 ? 'bg-emerald-500' : 'bg-blue-500')}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  };

  const renderLogForm = (goal: Goal) => {
    const isRatio  = goal.goal_type === 'ratio';
    const formula  = (goal.formula as any) ?? {};
    const numLabel = formula.numerator_label   || 'Value';
    const denLabel = formula.denominator_label || 'Denominator';
    const mode     = effectiveTrackingMode(goal);
    const isAutoOnly = mode === 'automatic';

    return (
      <div className="mt-4 p-4 bg-blue-50/60 rounded-2xl border border-blue-100 space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400">
          {isAutoOnly ? 'Manual Override Entry' : 'Log Progress'}
          {isAutoOnly && (
            <span className="ml-2 text-[9px] font-normal text-blue-300">
              (auto goal — note your manual override)
            </span>
          )}
        </p>

        {isRatio ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-blue-600">{numLabel}</label>
              <input
                type="number" step="any"
                className="mt-1 w-full px-3 py-2 bg-white border border-blue-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="e.g. 1200"
                value={logValue}
                onChange={e => setLogValue(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-blue-600">{denLabel}</label>
              <input
                type="number" step="any"
                className="mt-1 w-full px-3 py-2 bg-white border border-blue-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="e.g. 800"
                value={logDenominator}
                onChange={e => setLogDenominator(e.target.value)}
              />
            </div>
          </div>
        ) : (
          <div>
            <label className="text-[10px] font-bold text-blue-600">
              New value ({goal.unit || 'units'})
            </label>
            <input
              type="number" step="any"
              className="mt-1 w-full px-3 py-2 bg-white border border-blue-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder={`e.g. ${goal.current}`}
              value={logValue}
              onChange={e => setLogValue(e.target.value)}
            />
          </div>
        )}

        {/* Live ratio preview */}
        {isRatio && logValue && logDenominator && (
          <p className="text-[10px] font-bold text-blue-600">
            → Computed ratio:{' '}
            {parseFloat(logDenominator) > 0
              ? (parseFloat(logValue) / parseFloat(logDenominator)).toFixed(4)
              : '—'}{' '}
            : 1
          </p>
        )}

        {/* Note */}
        <div>
          <label className="text-[10px] font-bold text-blue-600">Note (optional)</label>
          <input
            type="text"
            className="mt-1 w-full px-3 py-2 bg-white border border-blue-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="e.g. Checked on April 16"
            value={logNote}
            onChange={e => setLogNote(e.target.value)}
          />
        </div>

        <button
          type="button"
          disabled={logging || !logValue}
          onClick={() => logProgress(goal)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {logging ? <Loader2 className="w-3 h-3 animate-spin" /> : <TrendingUp className="w-3 h-3" />}
          Save Entry
        </button>
      </div>
    );
  };

  const renderEntryHistory = (goal: Goal) => {
    const entries = entryHistory[goal.id] ?? [];
    if (entries.length === 0) {
      return <p className="text-[10px] text-slate-400 italic mt-3 px-1">No entries logged yet.</p>;
    }
    return (
      <div className="mt-3 space-y-1.5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Recent Entries</p>
        {entries.map(entry => (
          <div key={entry.id} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-xl">
            <div className="min-w-0">
              <span className="text-xs font-bold text-slate-900">
                {goal.goal_type === 'ratio'
                  ? `${entry.value.toFixed(4)} : 1`
                  : `${entry.value.toLocaleString()} ${goal.unit}`}
              </span>
              {entry.note && (
                <span className="ml-2 text-[10px] text-slate-400 truncate">— {entry.note}</span>
              )}
            </div>
            <span className="shrink-0 text-[10px] text-slate-400 ml-2">
              {(entry.recorded_at ?? entry.created_at ?? '').split('T')[0]}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const renderGoalCard = (goal: Goal) => {
    const mode       = effectiveTrackingMode(goal);
    const pace       = calculateGoalPace(goal);
    const aiStatus   = goalStatuses[goal.id];
    const isExpanded = expandedGoalId === goal.id;
    const goalType   = (goal.goal_type ?? 'count') as string;
    const isTimeless  = goal.is_timeless;
    const isMilestone = goalType === 'milestone';

    const badgeMode = TRACKING_BADGE[mode] ?? TRACKING_BADGE.manual;
    const badgeType = TYPE_BADGE[goalType] ?? TYPE_BADGE.count;

    return (
      <div key={goal.id} className="relative p-4 bg-slate-50/30 rounded-2xl border border-transparent hover:border-slate-100 transition-all space-y-3 group/item">

        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1 min-w-0">

            {/* Title + badges */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-base font-bold text-slate-900 truncate">{goal.title}</span>

              {/* Tracking mode */}
              <span className={cn('text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tight', badgeMode.bg)}>
                {badgeMode.label}
              </span>

              {/* Goal type (skip for default count) */}
              {goalType !== 'count' && (
                <span className={cn('text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tight', badgeType.bg)}>
                  {badgeType.label}
                </span>
              )}

              {/* Timeless */}
              {isTimeless && (
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tight bg-amber-50 text-amber-600">
                  Timeless
                </span>
              )}

              {/* Pace (timed goals only) */}
              {!isTimeless && !isMilestone && (
                <span className={cn(
                  'text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tight',
                  pace.status === 'ahead'    && 'bg-emerald-100 text-emerald-700',
                  pace.status === 'on-track' && 'bg-blue-100 text-blue-700',
                  pace.status === 'behind'   && 'bg-rose-100 text-rose-700',
                )}>
                  {pace.status}
                </span>
              )}

              {/* AI status */}
              {aiStatus && (
                <span className={cn(
                  'text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tight',
                  aiStatus.status === 'on-track' && 'bg-emerald-50 text-emerald-600',
                  aiStatus.status === 'at-risk'  && 'bg-amber-50 text-amber-600',
                  aiStatus.status === 'behind'   && 'bg-rose-50 text-rose-600',
                )}>
                  AI: {aiStatus.status}
                </span>
              )}
            </div>

            {goal.description && (
              <p className="text-[10px] text-slate-400 mt-0.5">{goal.description}</p>
            )}
          </div>

          {/* Context menu */}
          <div className="relative shrink-0">
            <button
              onClick={() => setShowMenu(showMenu === goal.id ? null : goal.id)}
              className="p-1 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <MoreVertical className="w-4 h-4 text-slate-400" />
            </button>
            {showMenu === goal.id && (
              <div className="absolute right-0 mt-2 w-40 bg-white border border-slate-100 rounded-xl shadow-xl z-50 py-1">
                <button
                  onClick={() => { setEditingGoal(goal); setShowGoalModal(true); setShowMenu(null); }}
                  className="w-full px-4 py-2 text-left text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                >
                  <Edit2 className="w-3 h-3" /> Edit Goal
                </button>
                <button
                  onClick={() => deleteGoal(goal.id)}
                  className="w-full px-4 py-2 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                >
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Progress */}
        {renderProgressDisplay(goal)}

        {/* Pace row (timed goals only) */}
        {!isTimeless && !isMilestone && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-slate-400" />
              <p className="text-[10px] text-slate-500 font-medium">
                {pace.predictedCompletion !== 'N/A'
                  ? <>Est. completion: <span className="font-bold text-slate-900">{pace.predictedCompletion}</span></>
                  : <>Deadline: <span className="font-bold text-slate-900">{goal.deadline ?? '—'}</span></>}
              </p>
            </div>
            {pace.status === 'behind' && (
              <div className="flex items-center gap-1 text-rose-600">
                <AlertCircle className="w-3 h-3" />
                <p className="text-[10px] font-bold uppercase tracking-tight">Action needed</p>
              </div>
            )}
          </div>
        )}

        {/* Source metric row */}
        {goal.source_metric && (
          <div className="flex items-center gap-1.5">
            <Activity className="w-3 h-3 text-emerald-500" />
            <p className="text-[10px] text-slate-400">
              Synced from:{' '}
              <span className="font-bold text-slate-600">{goal.source_metric.replace(/_/g, ' ')}</span>
            </p>
          </div>
        )}

        {/* Expand toggle */}
        <button
          type="button"
          onClick={() => toggleExpand(goal.id)}
          className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-blue-500 transition-colors"
        >
          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {isExpanded ? 'Collapse' : 'Log Entry & History'}
        </button>

        {/* Expanded panel */}
        {isExpanded && (
          <div>
            {renderLogForm(goal)}
            {renderEntryHistory(goal)}
          </div>
        )}
      </div>
    );
  };

  // ── Layout ────────────────────────────────────────────────────────────────

  const groupedGoals = {
    short:  goals.filter(g => g.term === 'short'),
    medium: goals.filter(g => g.term === 'medium'),
    long:   goals.filter(g => g.term === 'long'),
  };

  const columns = [
    { key: 'short'  as const, icon: <Zap        className="w-4 h-4 text-amber-500"  />, label: 'Short Term'  },
    { key: 'medium' as const, icon: <Target      className="w-4 h-4 text-blue-500"   />, label: 'Medium Term' },
    { key: 'long'   as const, icon: <ArrowUpRight className="w-4 h-4 text-blue-500" />, label: 'Long Term'   },
  ];

  return (
    <section className="glass-card p-8 group hover:border-blue-200 transition-all">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Target className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">Goals Tracker</h3>
            <p className="text-[10px] text-slate-400">Manual · Automatic · Hybrid · Ratio</p>
          </div>
        </div>
        <button
          onClick={() => { setEditingGoal(null); setShowGoalModal(true); }}
          className="btn-secondary text-xs py-2 px-3"
        >
          <Plus className="w-4 h-4" /> Add Goal
        </button>
      </div>

      {/* Body */}
      <div className="space-y-12">
        {loading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : goals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {columns.map(({ key, icon, label }) => (
              <div key={key} className="space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  {icon}
                  <h4 className="text-sm font-bold text-slate-900">{label}</h4>
                  <span className="ml-auto text-[10px] text-slate-400">{groupedGoals[key].length}</span>
                </div>
                {groupedGoals[key].length > 0
                  ? <div className="space-y-4">{groupedGoals[key].map(g => renderGoalCard(g))}</div>
                  : <p className="text-xs text-slate-400 italic">No {label.toLowerCase()} goals</p>}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 flex flex-col items-center justify-center text-center bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4">
              <Target className="w-8 h-8 text-slate-300" />
            </div>
            <h4 className="text-lg font-bold text-slate-900">No Active Goals</h4>
            <p className="text-sm text-slate-500 max-w-[280px] mt-2 mb-6">
              Set your first target to start tracking your growth and momentum.
            </p>
            <button
              onClick={() => { setEditingGoal(null); setShowGoalModal(true); }}
              className="btn-primary"
            >
              Set First Goal
            </button>
          </div>
        )}
      </div>

      {/* AI Analysis */}
      {goals.length > 0 && (
        <div className="mt-8 p-4 bg-blue-50 border border-blue-100 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">AI Analysis</p>
            </div>
            {!analyzing && !analysis && (
              <button onClick={runAIAnalysis} className="text-[10px] font-bold text-blue-600 hover:underline">
                Analyze Progress
              </button>
            )}
            {!analyzing && analysis && (
              <button
                onClick={() => { setAnalysis(null); runAIAnalysis(); }}
                className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-600"
              >
                <RefreshCw className="w-3 h-3" /> Refresh
              </button>
            )}
          </div>
          {analyzing ? (
            <div className="flex items-center gap-2 text-blue-600">
              <Loader2 className="w-3 h-3 animate-spin" />
              <p className="text-xs font-medium italic">Generating insights...</p>
            </div>
          ) : analysis ? (
            <p className="text-xs font-medium text-blue-900 leading-relaxed">{analysis}</p>
          ) : (
            <p className="text-xs text-blue-400 italic">
              Click analyze to get strategic insights on your goals.
            </p>
          )}
        </div>
      )}

      {/* Modal */}
      <GoalModal
        isOpen={showGoalModal}
        onClose={() => { setShowGoalModal(false); setEditingGoal(null); }}
        onSuccess={() => {
          fetchGoals();
          onAction?.(editingGoal ? 'Goal updated' : 'Goal added');
        }}
        goal={editingGoal}
      />
    </section>
  );
}
