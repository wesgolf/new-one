import React, { useEffect, useMemo, useState } from 'react';
import { formatDistanceToNowStrict } from 'date-fns';
import { LineChart, Milestone, Plus } from 'lucide-react';
import { fetchGoalEntries, fetchGoals, saveGoal, saveGoalEntry } from '../lib/supabaseData';
import type { GoalEntry, GoalRecord } from '../types/domain';

const GOAL_TYPES = ['count', 'ratio', 'milestone', 'custom'] as const;
const TRACKING_MODES = ['manual', 'automatic', 'hybrid'] as const;

export function GoalTracker() {
  const [goals, setGoals] = useState<GoalRecord[]>([]);
  const [selectedGoal, setSelectedGoal] = useState<GoalRecord | null>(null);
  const [entries, setEntries] = useState<Record<string, GoalEntry[]>>({});
  const [showNewGoal, setShowNewGoal] = useState(false);
  const [newGoal, setNewGoal] = useState<Partial<GoalRecord>>({
    goal_type: 'count',
    tracking_mode: 'manual',
    unit: '',
    is_timeless: false,
  });
  const [entryForm, setEntryForm] = useState({ value: '', note: '' });

  const load = async () => {
    const rows = await fetchGoals();
    setGoals(rows);
    if (rows[0] && !selectedGoal) {
      setSelectedGoal(rows[0]);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!selectedGoal) return;
    fetchGoalEntries(selectedGoal.id).then((result) => {
      setEntries((current) => ({ ...current, [selectedGoal.id]: result }));
    });
  }, [selectedGoal]);

  const selectedEntries = selectedGoal ? entries[selectedGoal.id] || [] : [];
  const goalCards = useMemo(() => goals, [goals]);

  const createGoal = async (event: React.FormEvent) => {
    event.preventDefault();
    await saveGoal(newGoal);
    setShowNewGoal(false);
    setNewGoal({
      goal_type: 'count',
      tracking_mode: 'manual',
      unit: '',
      is_timeless: false,
    });
    await load();
  };

  const addEntry = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedGoal || !entryForm.value) return;
    await saveGoalEntry({
      goal_id: selectedGoal.id,
      value: Number(entryForm.value),
      note: entryForm.note || null,
    });
    await saveGoal({
      ...selectedGoal,
      current_value: Number(entryForm.value),
    });
    setEntryForm({ value: '', note: '' });
    await load();
    const refreshed = await fetchGoalEntries(selectedGoal.id);
    setEntries((current) => ({ ...current, [selectedGoal.id]: refreshed }));
  };

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-text-tertiary">Goals</p>
          <h1 className="mt-2 text-4xl font-bold text-text-primary">Manual, automatic, and hybrid tracking</h1>
          <p className="mt-2 max-w-2xl text-text-secondary">
            Manual mode no longer freezes the data model. Goals can hold direct entries, formula metadata, ratio targets, and timeless tracking windows.
          </p>
        </div>
        <button type="button" onClick={() => setShowNewGoal(true)} className="btn-primary">
          <Plus className="h-4 w-4" />
          New Goal
        </button>
      </header>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="space-y-4">
          {goalCards.map((goal) => (
            <button
              key={goal.id}
              type="button"
              onClick={() => setSelectedGoal(goal)}
              className={`w-full rounded-[2rem] border p-5 text-left shadow-sm ${selectedGoal?.id === goal.id ? 'border-slate-950 bg-slate-950 text-white' : 'border-border bg-white text-text-primary'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${selectedGoal?.id === goal.id ? 'text-white/70' : 'text-text-tertiary'}`}>
                    {goal.tracking_mode} • {goal.goal_type}
                  </p>
                  <h3 className="mt-2 text-2xl font-bold">{goal.title}</h3>
                </div>
                <span className={`badge ${selectedGoal?.id === goal.id ? 'bg-white/15 text-white' : 'badge-primary'}`}>
                  {goal.is_timeless ? 'Timeless' : 'Timed'}
                </span>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
                <div className={`rounded-2xl p-3 ${selectedGoal?.id === goal.id ? 'bg-white/10' : 'bg-slate-50'}`}>
                  <p className={selectedGoal?.id === goal.id ? 'text-white/60' : 'text-text-tertiary'}>Current</p>
                  <p className="mt-2 font-semibold">{goal.current_value ?? 0}</p>
                </div>
                <div className={`rounded-2xl p-3 ${selectedGoal?.id === goal.id ? 'bg-white/10' : 'bg-slate-50'}`}>
                  <p className={selectedGoal?.id === goal.id ? 'text-white/60' : 'text-text-tertiary'}>Target</p>
                  <p className="mt-2 font-semibold">{goal.target_value ?? 'Open'}</p>
                </div>
                <div className={`rounded-2xl p-3 ${selectedGoal?.id === goal.id ? 'bg-white/10' : 'bg-slate-50'}`}>
                  <p className={selectedGoal?.id === goal.id ? 'text-white/60' : 'text-text-tertiary'}>Unit</p>
                  <p className="mt-2 font-semibold">{goal.unit || 'Custom'}</p>
                </div>
              </div>
            </button>
          ))}
        </section>

        <section className="rounded-[2rem] border border-border bg-white p-6 shadow-sm">
          {!selectedGoal ? (
            <div className="text-sm text-text-secondary">Select a goal to inspect progress.</div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">Goal detail</p>
                  <h2 className="mt-2 text-3xl font-bold text-text-primary">{selectedGoal.title}</h2>
                  <p className="mt-2 text-sm text-text-secondary">{selectedGoal.description || 'No description yet.'}</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-2xl bg-slate-50 p-4 text-center">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">Mode</p>
                    <p className="mt-2 font-semibold text-text-primary">{selectedGoal.tracking_mode}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4 text-center">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">Source</p>
                    <p className="mt-2 font-semibold text-text-primary">{selectedGoal.source_metric || 'Manual'}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4 text-center">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">Window</p>
                    <p className="mt-2 font-semibold text-text-primary">{selectedGoal.is_timeless ? 'Timeless' : selectedGoal.end_date || 'Open'}</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-[1.75rem] border border-border p-5">
                  <div className="flex items-center gap-2">
                    <Milestone className="h-4 w-4 text-text-tertiary" />
                    <h3 className="text-lg font-semibold text-text-primary">Progress summary</h3>
                  </div>
                  <div className="mt-4 space-y-3 text-sm text-text-secondary">
                    <p>Current value: <span className="font-semibold text-text-primary">{selectedGoal.current_value ?? 0}</span></p>
                    <p>Target value: <span className="font-semibold text-text-primary">{selectedGoal.target_value ?? 'Open-ended'}</span></p>
                    <p>Ratio formula: <span className="font-semibold text-text-primary">{selectedGoal.goal_type === 'ratio' ? JSON.stringify(selectedGoal.formula || { numerator: 'followers', denominator: 'following' }) : 'Not a ratio goal'}</span></p>
                  </div>
                </div>
                <div className="rounded-[1.75rem] border border-border p-5">
                  <div className="flex items-center gap-2">
                    <LineChart className="h-4 w-4 text-text-tertiary" />
                    <h3 className="text-lg font-semibold text-text-primary">Add progress entry</h3>
                  </div>
                  <form className="mt-4 space-y-3" onSubmit={addEntry}>
                    <input
                      type="number"
                      step="0.01"
                      value={entryForm.value}
                      onChange={(event) => setEntryForm((current) => ({ ...current, value: event.target.value }))}
                      className="input-base"
                      placeholder="Current value"
                    />
                    <textarea
                      value={entryForm.note}
                      onChange={(event) => setEntryForm((current) => ({ ...current, note: event.target.value }))}
                      className="min-h-24 w-full rounded-2xl border border-border bg-slate-50 px-4 py-3 text-sm text-text-primary outline-none"
                      placeholder="Optional manual override note"
                    />
                    <button type="submit" className="btn-primary">
                      Save entry
                    </button>
                  </form>
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-border p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">Recent history</p>
                <div className="mt-4 space-y-3">
                  {selectedEntries.length === 0 ? (
                    <p className="text-sm text-text-secondary">No manual history entries recorded yet.</p>
                  ) : (
                    selectedEntries.map((entry) => (
                      <div key={entry.id} className="rounded-2xl bg-slate-50 px-4 py-3">
                        <p className="font-semibold text-text-primary">{entry.value}</p>
                        {entry.note && <p className="mt-1 text-sm text-text-secondary">{entry.note}</p>}
                        <p className="mt-1 text-xs text-text-tertiary">
                          {entry.created_at ? formatDistanceToNowStrict(new Date(entry.created_at), { addSuffix: true }) : ''}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      {showNewGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[2rem] border border-border bg-white p-6 shadow-2xl">
            <div className="mb-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">New goal</p>
              <h3 className="mt-2 text-2xl font-bold text-text-primary">Create goal</h3>
            </div>
            <form className="space-y-4" onSubmit={createGoal}>
              <input className="input-base" placeholder="Goal title" value={newGoal.title || ''} onChange={(event) => setNewGoal((current) => ({ ...current, title: event.target.value }))} />
              <textarea className="min-h-28 w-full rounded-2xl border border-border bg-slate-50 px-4 py-3 text-sm text-text-primary outline-none" placeholder="Description" value={newGoal.description || ''} onChange={(event) => setNewGoal((current) => ({ ...current, description: event.target.value }))} />
              <div className="grid gap-4 md:grid-cols-3">
                <select className="input-base" value={newGoal.goal_type || 'count'} onChange={(event) => setNewGoal((current) => ({ ...current, goal_type: event.target.value as any }))}>
                  {GOAL_TYPES.map((goalType) => <option key={goalType} value={goalType}>{goalType}</option>)}
                </select>
                <select className="input-base" value={newGoal.tracking_mode || 'manual'} onChange={(event) => setNewGoal((current) => ({ ...current, tracking_mode: event.target.value as any }))}>
                  {TRACKING_MODES.map((mode) => <option key={mode} value={mode}>{mode}</option>)}
                </select>
                <input className="input-base" placeholder="Unit" value={newGoal.unit || ''} onChange={(event) => setNewGoal((current) => ({ ...current, unit: event.target.value }))} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <input type="number" className="input-base" placeholder="Target value" value={newGoal.target_value ?? ''} onChange={(event) => setNewGoal((current) => ({ ...current, target_value: event.target.value ? Number(event.target.value) : null }))} />
                <input type="datetime-local" className="input-base" value={newGoal.end_date ? newGoal.end_date.slice(0, 16) : ''} onChange={(event) => setNewGoal((current) => ({ ...current, end_date: event.target.value ? new Date(event.target.value).toISOString() : null }))} />
              </div>
              <label className="flex items-center gap-3 rounded-2xl border border-border bg-slate-50 px-4 py-3">
                <input type="checkbox" checked={Boolean(newGoal.is_timeless)} onChange={(event) => setNewGoal((current) => ({ ...current, is_timeless: event.target.checked }))} />
                <span className="text-sm text-text-primary">Timeless goal</span>
              </label>
              <div className="flex items-center justify-end gap-3">
                <button type="button" className="btn-secondary" onClick={() => setShowNewGoal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Save goal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
