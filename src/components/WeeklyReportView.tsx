/**
 * WeeklyReportView — print-ready report renderer.
 *
 * This component renders the structured WeeklyReport as a clean, professional
 * document. It has id="wos-report-print" which the @media print CSS uses to
 * isolate it as the only visible element when printing / saving as PDF.
 *
 * Usage:
 *   <WeeklyReportView report={report} />
 *   Then call window.print() to export.
 */

import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Minus } from 'lucide-react';
import type { WeeklyReport, ReportItem, WeeklyReportSection } from '../types/domain';

// ─── Status visualisation ─────────────────────────────────────────────────────

const STATUS_ICON = {
  positive: CheckCircle2,
  negative: XCircle,
  warning: AlertTriangle,
  neutral: Minus,
} as const;

const STATUS_COLOR = {
  positive: 'text-emerald-600',
  negative: 'text-red-500',
  warning: 'text-amber-500',
  neutral: 'text-slate-400',
} as const;

const TAG_CLASSES: Record<string, string> = {
  Overdue: 'bg-red-50 text-red-600',
  Blocked: 'bg-orange-50 text-orange-700',
  'Goal hit': 'bg-emerald-50 text-emerald-700',
  Urgent: 'bg-red-50 text-red-600',
  high: 'bg-orange-50 text-orange-700',
  medium: 'bg-amber-50 text-amber-700',
  low: 'bg-slate-100 text-slate-500',
  released: 'bg-emerald-50 text-emerald-700',
  scheduled: 'bg-blue-50 text-blue-700',
  mastered: 'bg-violet-50 text-violet-700',
  ready: 'bg-teal-50 text-teal-700',
  'Sync error': 'bg-red-50 text-red-600',
  error: 'bg-red-50 text-red-600',
  expired: 'bg-orange-50 text-orange-700',
};

// ─── Item row ─────────────────────────────────────────────────────────────────

function ReportItemRow({ item }: { item: ReportItem }) {
  const status = item.status ?? 'neutral';
  const Icon = STATUS_ICON[status] ?? Minus;
  const colorClass = STATUS_COLOR[status] ?? 'text-slate-400';
  const tagClass = item.tag ? (TAG_CLASSES[item.tag] ?? 'bg-slate-100 text-slate-500') : null;

  return (
    <li className="flex items-start gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${colorClass}`} />
      <div className="flex-1 min-w-0">
        <span className="text-sm text-slate-800">{item.text}</span>
        {item.meta && (
          <span className="ml-2 text-xs text-slate-400">{item.meta}</span>
        )}
      </div>
      {tagClass && item.tag && (
        <span
          className={`shrink-0 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full ${tagClass}`}
        >
          {item.tag}
        </span>
      )}
    </li>
  );
}

// ─── Section block ────────────────────────────────────────────────────────────

function SectionBlock({ section }: { section: WeeklyReportSection }) {
  return (
    <div className="break-inside-avoid">
      {/* Section header */}
      <div className="flex items-end justify-between mb-3">
        <h2 className="text-[15px] font-bold text-slate-900 tracking-tight">
          {section.title}
        </h2>
        {section.stats && section.stats.length > 0 && (
          <div className="flex items-center gap-5">
            {section.stats.map((s) => (
              <div key={s.label} className="text-right">
                <div className="text-xl font-bold text-slate-900 leading-none">
                  {s.value}
                </div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wide mt-0.5">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {section.narrative && (
        <p className="text-xs text-slate-500 mb-3 italic leading-relaxed">
          {section.narrative}
        </p>
      )}

      {/* Items */}
      <ul className="bg-slate-50 rounded-xl border border-slate-100 px-4 divide-y divide-slate-100">
        {section.items.map((item, i) => (
          <ReportItemRow key={i} item={item} />
        ))}
      </ul>
    </div>
  );
}

// ─── Main report view ─────────────────────────────────────────────────────────

interface WeeklyReportViewProps {
  report: WeeklyReport;
}

export function WeeklyReportView({ report }: WeeklyReportViewProps) {
  const startLabel = new Date(report.config.startDate).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const endLabel = new Date(report.config.endDate).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const generatedLabel = new Date(report.generatedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    // id used by @media print CSS to isolate this as the only visible region
    <div id="wos-report-print" className="bg-white font-sans">
      <div className="max-w-[720px] mx-auto px-8 py-10">
        {/* ── Report header ── */}
        <div className="flex items-start justify-between pb-6 mb-8 border-b-2 border-slate-900">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400 mb-1.5">
              Weekly Report
            </div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              {report.artistName}
            </h1>
            <p className="text-sm text-slate-500 mt-1.5">
              {startLabel} — {endLabel}
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
              Generated
            </div>
            <p className="text-sm text-slate-600 mt-1">{generatedLabel}</p>
          </div>
        </div>

        {/* ── Executive summary ── */}
        {report.executiveSummary && (
          <div className="mb-8 bg-slate-950 text-white rounded-xl p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 mb-2">
              Summary
            </p>
            <p className="text-sm leading-relaxed text-white/90">
              {report.executiveSummary}
            </p>
          </div>
        )}

        {/* ── Sections ── */}
        <div className="space-y-8">
          {report.sections.map((section) => (
            <SectionBlock key={section.id} section={section} />
          ))}
        </div>

        {/* ── Footer ── */}
        <div className="mt-10 pt-5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span>
            {report.artistName} · Artist OS
          </span>
          <span>Report ID: {report.id}</span>
        </div>
      </div>
    </div>
  );
}
