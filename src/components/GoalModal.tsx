import React, { useState, useEffect } from 'react';
import { X, Loader2, ToggleLeft, ToggleRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { Goal } from '../types';

interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  goal?: Goal | null;
}

const CATEGORIES = ['Streaming', 'Social', 'Live', 'Revenue'] as const;

const GOAL_TYPES = [
  { value: 'count',     label: 'Count',     desc: 'Hit a numeric target'          },
  { value: 'ratio',     label: 'Ratio',     desc: 'Maintain a ratio between metrics' },
  { value: 'milestone', label: 'Milestone', desc: 'A one-time achievement to complete' },
  { value: 'custom',    label: 'Custom',    desc: 'Flexible goal, your own formula' },
] as const;

const TRACKING_MODES = [
  { value: 'manual',    label: 'Manual',    desc: 'You log updates yourself'       },
  { value: 'automatic', label: 'Automatic', desc: 'Synced from analytics'          },
  { value: 'hybrid',    label: 'Hybrid',    desc: 'Auto-synced + manual override'  },
] as const;

const SOURCE_METRICS = [
  'spotify_monthly_listeners',
  'spotify_followers',
  'apple_music_plays',
  'instagram_followers',
  'tiktok_followers',
  'youtube_subscribers',
  'followers_to_following_ratio',
  'stream_to_save_ratio',
  'custom',
];

type GoalType     = typeof GOAL_TYPES[number]['value'];
type TrackingMode = typeof TRACKING_MODES[number]['value'];

interface FormData {
  title: string;
  description: string;
  goal_type: GoalType;
  tracking_mode: TrackingMode;
  target: string;
  current_value: string;
  unit: string;
  numerator_label: string;
  denominator_label: string;
  source_metric: string;
  category: string;
  term: string;
  start_date: string;
  deadline: string;
  is_timeless: boolean;
}

const defaultForm: FormData = {
  title: '',
  description: '',
  goal_type: 'count',
  tracking_mode: 'manual',
  target: '',
  current_value: '',
  unit: '',
  numerator_label: '',
  denominator_label: '',
  source_metric: '',
  category: 'Streaming',
  term: 'short',
  start_date: '',
  deadline: '',
  is_timeless: false,
};

export function GoalModal({ isOpen, onClose, onSuccess, goal }: GoalModalProps) {
  const [loading, setLoading]   = useState(false);
  const [formData, setFormData] = useState<FormData>(defaultForm);

  useEffect(() => {
    if (!isOpen) return;
    if (goal) {
      const formula = (goal.formula as any) ?? {};
      setFormData({
        title:             goal.title            ?? '',
        description:       goal.description      ?? '',
        goal_type:        (goal.goal_type        ?? 'count') as GoalType,
        tracking_mode:    goal.tracking_mode
          ? (goal.tracking_mode as TrackingMode)
          : goal.manual_progress ? 'manual' : 'automatic',
        target:            goal.target?.toString() ?? '',
        current_value:     goal.current?.toString() ?? '',
        unit:              goal.unit              ?? '',
        numerator_label:   formula.numerator_label   ?? '',
        denominator_label: formula.denominator_label ?? '',
        source_metric:     goal.source_metric    ?? '',
        category:          goal.category         ?? 'Streaming',
        term:              goal.term             ?? 'short',
        start_date:        goal.start_date        ?? '',
        deadline:          goal.deadline          ?? '',
        is_timeless:       goal.is_timeless        ?? false,
      });
    } else {
      setFormData(defaultForm);
    }
  }, [goal, isOpen]);

  if (!isOpen) return null;

  const set = <K extends keyof FormData>(k: K, v: FormData[K]) =>
    setFormData(prev => ({ ...prev, [k]: v }));

  const isRatio     = formData.goal_type === 'ratio';
  const isMilestone = formData.goal_type === 'milestone';
  const needsSource = formData.tracking_mode === 'automatic' || formData.tracking_mode === 'hybrid';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();

    // Build formula JSONB for ratio goals
    let formula: Record<string, string> | null = null;
    if (isRatio && (formData.numerator_label || formData.denominator_label)) {
      formula = {
        type:              'ratio',
        numerator_label:   formData.numerator_label   || 'Numerator',
        denominator_label: formData.denominator_label || 'Denominator',
      };
    }

    const targetNum  = isMilestone ? 1 : (parseFloat(formData.target)        || 0);
    const currentNum =              parseFloat(formData.current_value) || 0;

    const data: Record<string, unknown> = {
      title:          formData.title.trim(),
      description:    formData.description.trim() || null,
      goal_type:      formData.goal_type,
      tracking_mode:  formData.tracking_mode,
      manual_progress: formData.tracking_mode === 'manual',
      target:         targetNum,
      current:        goal ? undefined : currentNum,   // only set on create
      unit:           isMilestone ? 'milestone' : (formData.unit.trim() || (isRatio ? 'ratio' : 'units')),
      source_metric:  needsSource ? (formData.source_metric || null) : null,
      formula,
      category:       formData.category,
      term:           formData.term,
      start_date:     formData.start_date || null,
      deadline:       formData.is_timeless ? null : (formData.deadline || null),
      is_timeless:    formData.is_timeless,
      updated_at:     new Date().toISOString(),
    };

    // Don't send `current: undefined` on updates — skip the field entirely
    if (goal) delete data.current;
    if (!goal && user) data.user_id = user.id;

    const { error } = goal
      ? await supabase.from('goals').update(data).eq('id', goal.id)
      : await supabase.from('goals').insert([data]);

    if (!error) {
      onSuccess();
      onClose();
    } else {
      console.error('Error saving goal:', error);
      alert('Failed to save goal: ' + error.message);
    }
    setLoading(false);
  };

  const inputCls = 'w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all';
  const labelCls = 'block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-lg flex flex-col" style={{ maxHeight: '92vh' }}>

        {/* Header */}
        <div className="flex justify-between items-center px-8 pt-8 pb-4 shrink-0">
          <h3 className="text-xl font-bold text-slate-900">{goal ? 'Edit Goal' : 'New Goal'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Scrollable form body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto px-8 pb-8 space-y-5">

          {/* Title */}
          <div>
            <label className={labelCls}>Goal Title</label>
            <input
              required type="text" className={inputCls}
              placeholder="e.g. Hit 10K Monthly Listeners"
              value={formData.title}
              onChange={e => set('title', e.target.value)}
            />
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}>
              Description{' '}
              <span className="normal-case font-normal text-slate-400">(optional)</span>
            </label>
            <textarea
              rows={2} className={cn(inputCls, 'resize-none')}
              placeholder="What does success look like?"
              value={formData.description}
              onChange={e => set('description', e.target.value)}
            />
          </div>

          {/* Goal type selector */}
          <div>
            <label className={labelCls}>Goal Type</label>
            <div className="grid grid-cols-2 gap-2">
              {GOAL_TYPES.map(gt => (
                <button
                  key={gt.value} type="button"
                  onClick={() => set('goal_type', gt.value)}
                  className={cn(
                    'p-3 rounded-xl border text-left transition-all',
                    formData.goal_type === gt.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-100 hover:border-slate-200',
                  )}
                >
                  <p className="text-xs font-bold text-slate-900">{gt.label}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{gt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Tracking mode selector */}
          <div>
            <label className={labelCls}>Tracking Mode</label>
            <div className="grid grid-cols-3 gap-2">
              {TRACKING_MODES.map(tm => (
                <button
                  key={tm.value} type="button"
                  onClick={() => set('tracking_mode', tm.value)}
                  className={cn(
                    'p-3 rounded-xl border text-left transition-all',
                    formData.tracking_mode === tm.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-100 hover:border-slate-200',
                  )}
                >
                  <p className="text-xs font-bold text-slate-900">{tm.label}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{tm.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Source metric — only for automatic / hybrid */}
          {needsSource && (
            <div>
              <label className={labelCls}>Source Metric</label>
              <select
                className={inputCls}
                value={formData.source_metric}
                onChange={e => set('source_metric', e.target.value)}
              >
                <option value="">— select a metric —</option>
                {SOURCE_METRICS.map(m => (
                  <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400 mt-1">
                Analytics metric this goal reads from when auto-synced.
              </p>
            </div>
          )}

          {/* Ratio labels */}
          {isRatio && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Numerator Label</label>
                <input
                  type="text" className={inputCls} placeholder="e.g. Followers"
                  value={formData.numerator_label}
                  onChange={e => set('numerator_label', e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls}>Denominator Label</label>
                <input
                  type="text" className={inputCls} placeholder="e.g. Following"
                  value={formData.denominator_label}
                  onChange={e => set('denominator_label', e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Target + Unit (hidden for milestone) */}
          {!isMilestone && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>{isRatio ? 'Target Ratio' : 'Target Value'}</label>
                <input
                  required type="number" step="any" className={inputCls}
                  placeholder={isRatio ? 'e.g. 2 (means 2:1)' : '10000'}
                  value={formData.target}
                  onChange={e => set('target', e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls}>{isRatio ? 'Unit' : 'Unit'}</label>
                <input
                  type="text" className={inputCls}
                  placeholder={isRatio ? 'ratio' : 'listeners'}
                  required={!isRatio}
                  value={formData.unit}
                  onChange={e => set('unit', e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Starting current value */}
          {!isMilestone && (
            <div>
              <label className={labelCls}>
                Current Value{' '}
                <span className="normal-case font-normal text-slate-400">(starting point, optional)</span>
              </label>
              <input
                type="number" step="any" className={inputCls}
                placeholder="0"
                value={formData.current_value}
                onChange={e => set('current_value', e.target.value)}
              />
            </div>
          )}

          {/* Category + Term */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Category</label>
              <select className={inputCls} value={formData.category} onChange={e => set('category', e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Term</label>
              <select className={inputCls} value={formData.term} onChange={e => set('term', e.target.value)}>
                <option value="short">Short Term</option>
                <option value="medium">Medium Term</option>
                <option value="long">Long Term</option>
              </select>
            </div>
          </div>

          {/* Timeless toggle */}
          <button
            type="button"
            onClick={() => set('is_timeless', !formData.is_timeless)}
            className={cn(
              'flex items-center gap-3 w-full p-4 rounded-xl border text-left transition-all',
              formData.is_timeless ? 'border-amber-300 bg-amber-50' : 'border-slate-100 hover:border-slate-200',
            )}
          >
            {formData.is_timeless
              ? <ToggleRight className="w-5 h-5 text-amber-500 shrink-0" />
              : <ToggleLeft  className="w-5 h-5 text-slate-300 shrink-0" />}
            <div>
              <p className="text-sm font-bold text-slate-800">Timeless Goal</p>
              <p className="text-[10px] text-slate-400">
                No deadline — rolling ratio or ongoing metric to maintain
              </p>
            </div>
          </button>

          {/* Dates (hidden when timeless) */}
          {!formData.is_timeless && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Start Date</label>
                <input
                  type="date" className={inputCls}
                  value={formData.start_date}
                  onChange={e => set('start_date', e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls}>Deadline</label>
                <input
                  type="date" className={inputCls}
                  value={formData.deadline}
                  onChange={e => set('deadline', e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit" disabled={loading}
            className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading
              ? <Loader2 className="w-5 h-5 animate-spin" />
              : (goal ? 'Update Goal' : 'Create Goal')}
          </button>
        </form>
      </div>
    </div>
  );
}
