/**
 * WeeklyReportModal — 3-phase report flow:
 *
 *   Phase 1 (config)    – date range shortcuts + section toggles
 *   Phase 2 (loading)   – generation progress indicator
 *   Phase 3 (report)    – full report view + Export PDF button
 *
 * PDF export: renders WeeklyReportView into id="wos-report-print",
 * then calls window.print(). The @media print CSS in index.css
 * makes only that element visible during printing.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Download, Loader2, ChevronLeft, AlertCircle, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { buildWeeklyReport } from '../services/reportService';
import { WeeklyReportView } from './WeeklyReportView';
import type { WeeklyReportConfig, WeeklyReport, ReportSectionId } from '../types/domain';

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_SECTIONS: Array<{ id: ReportSectionId; label: string; description: string }> = [
  { id: 'wins',                label: 'Wins',                description: 'Completed tasks, released tracks, goals hit' },
  { id: 'losses',              label: 'Challenges',          description: 'Overdue & blocked items' },
  { id: 'release_highlights',  label: 'Release Highlights',  description: 'Active releases and catalog status' },
  { id: 'task_summary',        label: 'Task Summary',        description: 'Created, completed, overdue counts' },
  { id: 'action_items',        label: 'Action Items',        description: 'Open tasks sorted by priority' },
  { id: 'content_performance', label: 'Content Performance', description: 'Post analytics (requires integrations)' },
  { id: 'sync_issues',         label: 'Sync Issues',         description: 'Failed syncs and integration errors' },
];

// Range shortcuts
function thisWeekRange(): { start: string; end: string; label: string } {
  const today = new Date();
  const day = today.getDay(); // 0 = Sunday
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((day + 6) % 7));
  return {
    start: monday.toISOString().split('T')[0],
    end: today.toISOString().split('T')[0],
    label: 'This Week',
  };
}

function lastWeekRange(): { start: string; end: string; label: string } {
  const today = new Date();
  const day = today.getDay();
  const thisMonday = new Date(today);
  thisMonday.setDate(today.getDate() - ((day + 6) % 7));
  const lastMonday = new Date(thisMonday);
  lastMonday.setDate(thisMonday.getDate() - 7);
  const lastSunday = new Date(thisMonday);
  lastSunday.setDate(thisMonday.getDate() - 1);
  return {
    start: lastMonday.toISOString().split('T')[0],
    end: lastSunday.toISOString().split('T')[0],
    label: 'Last Week',
  };
}

function daysAgoRange(days: number): { start: string; end: string; label: string } {
  const today = new Date();
  const past = new Date(today);
  past.setDate(today.getDate() - days);
  return {
    start: past.toISOString().split('T')[0],
    end: today.toISOString().split('T')[0],
    label: `Last ${days} days`,
  };
}

const DATE_PRESETS = [
  thisWeekRange(),
  lastWeekRange(),
  daysAgoRange(7),
  daysAgoRange(30),
];

type Phase = 'config' | 'loading' | 'report';

interface WeeklyReportModalProps {
  onClose: () => void;
}

// ─── Config phase ─────────────────────────────────────────────────────────────

function ConfigPhase({
  onGenerate,
}: {
  onGenerate: (config: WeeklyReportConfig) => void;
}) {
  const [preset, setPreset] = useState(0); // index into DATE_PRESETS
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [sections, setSections] = useState<ReportSectionId[]>(
    ALL_SECTIONS.map((s) => s.id),
  );

  function toggleSection(id: ReportSectionId) {
    setSections((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  }

  function handleGenerate() {
    const range = useCustom
      ? { start: customStart, end: customEnd, label: 'Custom range' }
      : DATE_PRESETS[preset];

    if (!range.start || !range.end) return;

    onGenerate({
      startDate: range.start,
      endDate: range.end,
      sections:
        sections.length > 0
          ? ALL_SECTIONS.map((s) => s.id).filter((id) => sections.includes(id))
          : ALL_SECTIONS.map((s) => s.id),
      label: range.label,
    });
  }

  const canGenerate = useCustom ? Boolean(customStart && customEnd) : true;

  return (
    <div className="overflow-y-auto max-h-[80vh] p-6 space-y-6">
      {/* Date range */}
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-text-muted mb-3">
          Date range
        </p>
        <div className="grid grid-cols-2 gap-2">
          {DATE_PRESETS.map((p, i) => (
            <button
              key={p.label}
              type="button"
              onClick={() => { setPreset(i); setUseCustom(false); }}
              className={cn(
                'rounded-xl border px-3 py-2.5 text-left text-sm transition-all',
                !useCustom && preset === i
                  ? 'border-brand bg-brand-dim text-brand font-semibold'
                  : 'border-border text-text-secondary hover:border-brand/40',
              )}
            >
              {p.label}
              <span className="block text-[11px] text-text-muted font-normal mt-0.5">
                {new Date(p.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                {' — '}
                {new Date(p.end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </button>
          ))}
        </div>

        {/* Custom date range toggle */}
        <button
          type="button"
          onClick={() => setUseCustom((v) => !v)}
          className={cn(
            'mt-2 w-full rounded-xl border px-3 py-2.5 text-left text-sm transition-all',
            useCustom
              ? 'border-brand bg-brand-dim text-brand font-semibold'
              : 'border-border text-text-muted hover:border-brand/40',
          )}
        >
          Custom range
        </button>

        {useCustom && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-xs text-text-muted mb-1 block">From</span>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="input-base text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs text-text-muted mb-1 block">To</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="input-base text-sm"
              />
            </label>
          </div>
        )}
      </div>

      {/* Section toggles */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-text-muted">
            Include sections
          </p>
          <button
            type="button"
            onClick={() =>
              sections.length === ALL_SECTIONS.length
                ? setSections([])
                : setSections(ALL_SECTIONS.map((s) => s.id))
            }
            className="text-xs text-brand hover:underline"
          >
            {sections.length === ALL_SECTIONS.length ? 'Deselect all' : 'Select all'}
          </button>
        </div>
        <div className="space-y-1.5">
          {ALL_SECTIONS.map((s) => {
            const active = sections.includes(s.id);
            return (
              <label
                key={s.id}
                className={cn(
                  'flex items-center gap-3 rounded-xl border px-3 py-2.5 cursor-pointer transition-all',
                  active
                    ? 'border-brand/30 bg-brand-dim'
                    : 'border-border hover:border-brand/20',
                )}
              >
                <div
                  className={cn(
                    'w-4 h-4 rounded-md border-2 flex items-center justify-center shrink-0 transition-all',
                    active ? 'border-brand bg-brand' : 'border-border bg-white',
                  )}
                >
                  {active && <Check className="w-2.5 h-2.5 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-text-primary">{s.label}</p>
                  <p className="text-[11px] text-text-muted truncate">{s.description}</p>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Generate button */}
      <button
        type="button"
        onClick={handleGenerate}
        disabled={!canGenerate || sections.length === 0}
        className="btn-primary w-full"
      >
        Generate Report
      </button>
    </div>
  );
}

// ─── Loading phase ────────────────────────────────────────────────────────────

const LOADING_STEPS = [
  'Fetching tasks and goals…',
  'Loading release catalog…',
  'Checking sync logs…',
  'Generating AI summary…',
  'Building report…',
];

function LoadingPhase() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1));
    }, 700);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 gap-5">
      <Loader2 className="w-8 h-8 text-brand animate-spin" />
      <div className="text-center space-y-1">
        <p className="text-sm font-semibold text-text-primary">Building your report</p>
        <AnimatePresence mode="wait">
          <motion.p
            key={step}
            className="text-xs text-text-muted"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            {LOADING_STEPS[step]}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Report phase ─────────────────────────────────────────────────────────────

function ReportPhase({
  report,
  onBack,
}: {
  report: WeeklyReport;
  onBack: () => void;
}) {
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  return (
    <div className="flex flex-col h-full max-h-[85vh]">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="btn-secondary text-xs gap-1.5 px-3 py-1.5"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Back
        </button>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text-primary truncate">
            Weekly Report
          </p>
          <p className="text-xs text-text-muted">
            {new Date(report.config.startDate).toLocaleDateString('en-US', {
              month: 'short', day: 'numeric',
            })}
            {' — '}
            {new Date(report.config.endDate).toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric',
            })}
          </p>
        </div>

        <button
          type="button"
          onClick={handlePrint}
          className="btn-primary text-xs gap-1.5 px-3 py-1.5"
        >
          <Download className="w-3.5 h-3.5" />
          Export PDF
        </button>
      </div>

      {/* Report content — scrollable */}
      <div className="overflow-y-auto flex-1">
        <WeeklyReportView report={report} />
      </div>
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export function WeeklyReportModal({ onClose }: WeeklyReportModalProps) {
  const [phase, setPhase] = useState<Phase>('config');
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  async function handleGenerate(config: WeeklyReportConfig) {
    setError(null);
    setPhase('loading');
    try {
      const result = await buildWeeklyReport(config);
      setReport(result);
      setPhase('report');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Report generation failed');
      setPhase('config');
    }
  }

  const isReport = phase === 'report';

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label="Generate Weekly Report"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <motion.div
        layout
        className={cn(
          'bg-white rounded-2xl shadow-2xl relative flex flex-col overflow-hidden',
          isReport ? 'w-full max-w-2xl' : 'w-full max-w-md',
        )}
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Header (config + loading phases only) */}
        {phase !== 'report' && (
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border">
            <div>
              <h2 className="text-base font-bold text-text-primary">Weekly Report</h2>
              <p className="text-xs text-text-muted mt-0.5">
                {phase === 'loading'
                  ? 'Aggregating data and generating narrative…'
                  : 'Configure your report before generating.'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-slate-100 transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Close button for report phase (top-right) */}
        {phase === 'report' && (
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-10 p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-slate-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Error banner */}
        {error && (
          <div className="mx-6 mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 flex items-start gap-2 text-sm text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Phase content */}
        <AnimatePresence mode="wait">
          {phase === 'config' && (
            <motion.div
              key="config"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <ConfigPhase onGenerate={handleGenerate} />
            </motion.div>
          )}

          {phase === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <LoadingPhase />
            </motion.div>
          )}

          {phase === 'report' && report && (
            <motion.div
              key="report"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col"
            >
              <ReportPhase
                report={report}
                onBack={() => setPhase('config')}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
