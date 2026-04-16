/**
 * ActionBar — Top command strip for the dashboard.
 *
 * Buttons:
 *   - Generate Report → opens inline modal
 *   - Sync Now       → triggers analytics refresh + re-fetch
 *   - AI Assistant   → navigates to /coach
 *
 * Includes the GenerateReport modal inline to keep it co-located.
 */

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart2, RefreshCw, Sparkles,
  X, Download, Copy, ChevronDown, Check
} from 'lucide-react';
import { cn } from '../../lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type ReportType = 'performance' | 'content' | 'releases' | 'full';

const REPORT_TYPES: { value: ReportType; label: string; description: string }[] = [
  { value: 'performance', label: 'Performance Overview',  description: 'Streams, followers, engagement across platforms' },
  { value: 'content',     label: 'Content Report',        description: "What's working — top posts, formats, timing"    },
  { value: 'releases',    label: 'Release Summary',       description: 'Each release: sales, streams, pitch status'     },
  { value: 'full',        label: 'Full Artist Report',    description: 'Everything — performance, releases, content'    },
];

const DATE_RANGES = ['Last 7 days', 'Last 30 days', 'Last 90 days', 'This year'];

// ─── GenerateReport Modal ────────────────────────────────────────────────────

interface GenerateReportModalProps {
  onClose: () => void;
}

function GenerateReportModal({ onClose }: GenerateReportModalProps) {
  const [reportType, setReportType] = useState<ReportType>('full');
  const [dateRange, setDateRange] = useState('Last 30 days');
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);

  // Trap focus inside modal
  const overlayRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  async function handleGenerate() {
    setGenerating(true);
    // Simulate generation — real implementation would call an API
    await new Promise(r => setTimeout(r, 1400));
    setGenerating(false);
    setDone(true);
  }

  const selected = REPORT_TYPES.find(r => r.value === reportType)!;

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label="Generate Report"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-slate-100 transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <h2 className="text-lg font-bold text-text-primary mb-1">Generate Report</h2>
        <p className="text-sm text-text-secondary mb-5">
          Export an AI-generated summary you can share or save.
        </p>

        {/* Report type selector */}
        <fieldset className="mb-4">
          <legend className="text-xs font-bold text-text-tertiary uppercase tracking-widest mb-2">
            Report type
          </legend>
          <div className="space-y-2">
            {REPORT_TYPES.map(rt => (
              <label
                key={rt.value}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all',
                  reportType === rt.value
                    ? 'border-[var(--color-primary)] bg-blue-50'
                    : 'border-border hover:border-slate-300'
                )}
              >
                <input
                  type="radio"
                  name="reportType"
                  value={rt.value}
                  checked={reportType === rt.value}
                  onChange={() => setReportType(rt.value)}
                  className="mt-0.5 accent-[var(--color-primary)]"
                />
                <div>
                  <p className="text-sm font-semibold text-text-primary">{rt.label}</p>
                  <p className="text-xs text-text-tertiary">{rt.description}</p>
                </div>
              </label>
            ))}
          </div>
        </fieldset>

        {/* Date range */}
        <div className="mb-6">
          <label className="text-xs font-bold text-text-tertiary uppercase tracking-widest block mb-2">
            Time period
          </label>
          <div className="relative">
            <select
              value={dateRange}
              onChange={e => setDateRange(e.target.value)}
              className="w-full input-base pr-8 appearance-none"
            >
              {DATE_RANGES.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" />
          </div>
        </div>

        {/* Actions */}
        {done ? (
          <div className="flex gap-3">
            <button className="btn-secondary flex-1 flex items-center justify-center gap-2">
              <Copy className="w-4 h-4" />
              Copy to Clipboard
            </button>
            <button className="btn-primary flex-1 flex items-center justify-center gap-2">
              <Download className="w-4 h-4" />
              Download PDF
            </button>
          </div>
        ) : (
          <button
            onClick={handleGenerate}
            disabled={generating}
            className={cn(
              'btn-primary w-full flex items-center justify-center gap-2',
              generating && 'opacity-70 cursor-wait'
            )}
          >
            {generating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <BarChart2 className="w-4 h-4" />
                Generate {selected.label}
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── ActionBar ───────────────────────────────────────────────────────────────

interface ActionBarProps {
  onSyncNow: () => void;
  onAIAssistant?: () => void;
  syncing?: boolean;
  syncSuccess?: boolean;
}

export function ActionBar({ onSyncNow, onAIAssistant, syncing, syncSuccess }: ActionBarProps) {
  const navigate = useNavigate();
  const [showReportModal, setShowReportModal] = useState(false);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: page heading */}
        <div>
          <h1 className="text-xl font-bold text-text-primary">Command Center</h1>
          <p className="text-sm text-text-tertiary">
            {new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Right: action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowReportModal(true)}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <BarChart2 className="w-4 h-4" />
            Generate Report
          </button>

          <button
            onClick={onSyncNow}
            disabled={syncing}
            className={cn(
              'btn-secondary flex items-center gap-2 text-sm',
              syncing && 'opacity-70 cursor-wait'
            )}
            title="Sync latest analytics data"
          >
            {syncSuccess ? (
              <Check className="w-4 h-4 text-emerald-500" />
            ) : (
              <RefreshCw className={cn('w-4 h-4', syncing && 'animate-spin')} />
            )}
            {syncing ? 'Syncing…' : syncSuccess ? 'Synced' : 'Sync Now'}
          </button>

          <button
            onClick={() => onAIAssistant ? onAIAssistant() : navigate('/coach')}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Sparkles className="w-4 h-4" />
            AI Assistant
          </button>
        </div>
      </div>

      {showReportModal && (
        <GenerateReportModal onClose={() => setShowReportModal(false)} />
      )}
    </>
  );
}
