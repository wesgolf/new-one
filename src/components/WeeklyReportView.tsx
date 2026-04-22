/**
 * WeeklyReportView — Premium one-page executive report renderer.
 *
 * Designed to look like a real board-meeting document — not a dashboard.
 * Uses inline styles throughout for guaranteed print fidelity.
 *
 * The parent (WeeklyReportModal) wraps this in a print portal with
 * id="wos-report-print" so the @media print CSS can isolate it.
 *
 * Usage:
 *   <WeeklyReportView report={report} />
 *   Then call window.print() after mounting via portal.
 */

import React from 'react';
import type { WeeklyReport, WeeklyReportSection, ReportItem } from '../types/domain';

// ─── Formatting helpers ───────────────────────────────────────────────────────

function fmt(d: string, opts?: Intl.DateTimeFormatOptions): string {
  return new Date(d).toLocaleDateString('en-US', opts ?? {
    month: 'long', day: 'numeric', year: 'numeric',
  });
}

// ─── KPI aggregator ───────────────────────────────────────────────────────────

function getKPIs(report: WeeklyReport) {
  const stat = (sectionId: string, label: string) =>
    report.sections.find(s => s.id === sectionId)?.stats?.find(s => s.label === label)?.value ?? '—';
  return [
    { label: 'Tasks Completed', value: stat('wins', 'Tasks completed') },
    { label: 'Goals Hit',       value: stat('wins', 'Goals hit') },
    { label: 'Overdue Tasks',   value: stat('losses', 'Overdue tasks') },
    { label: 'Active Releases', value: stat('release_highlights', 'Released') },
  ];
}

// ─── Shared style tokens (inline, print-safe) ─────────────────────────────────

const FONT = "system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";

function sectionLabelStyle(): React.CSSProperties {
  return {
    fontSize: 9, fontWeight: 800, letterSpacing: '0.28em',
    textTransform: 'uppercase', color: '#94a3b8',
    paddingBottom: 8, marginBottom: 12,
    borderBottom: '1px solid #e2e8f0',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  };
}

function tagStyle(status?: ReportItem['status']): React.CSSProperties {
  const bg =
    status === 'positive' ? '#d1fae5' :
    status === 'negative' ? '#fee2e2' :
    status === 'warning'  ? '#fef3c7' : '#f1f5f9';
  const color =
    status === 'positive' ? '#065f46' :
    status === 'negative' ? '#991b1b' :
    status === 'warning'  ? '#92400e' : '#475569';
  return {
    flexShrink: 0, marginLeft: 'auto',
    fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
    textTransform: 'uppercase', padding: '2px 7px', borderRadius: 4,
    background: bg, color,
  };
}

function statusSymbol(status?: ReportItem['status']): string {
  return status === 'positive' ? '✓' :
         status === 'negative' ? '✗' :
         status === 'warning'  ? '▲' : '·';
}

function statusColor(status?: ReportItem['status']): string {
  return status === 'positive' ? '#059669' :
         status === 'negative' ? '#dc2626' :
         status === 'warning'  ? '#d97706' : '#cbd5e1';
}

// ─── Item row ─────────────────────────────────────────────────────────────────

interface ItemRowProps {
  item: ReportItem;
  numbered?: boolean;
  index?: number;
  last?: boolean;
}

function ItemRow({ item, numbered, index, last }: ItemRowProps) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '7px 0',
      borderBottom: last ? 'none' : '1px solid #f1f5f9',
    }}>
      {numbered && typeof index === 'number' ? (
        <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 900, color: '#cbd5e1', minWidth: 24, marginTop: 1 }}>
          {String(index + 1).padStart(2, '0')}
        </span>
      ) : (
        <span style={{ flexShrink: 0, fontSize: 12, fontWeight: 900, lineHeight: 1, marginTop: 1, color: statusColor(item.status) }}>
          {statusSymbol(item.status)}
        </span>
      )}
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 12, color: numbered ? '#0f172a' : '#1e293b', fontWeight: numbered ? 600 : 400 }}>
          {item.text}
        </span>
        {item.meta && (
          <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 6 }}>{item.meta}</span>
        )}
      </span>
      {item.tag && (
        <span style={tagStyle(item.status)}>{item.tag}</span>
      )}
    </div>
  );
}

// ─── Section block ────────────────────────────────────────────────────────────

interface SectionProps {
  section: WeeklyReportSection;
  overrideTitle?: string;
  maxItems?: number;
  numbered?: boolean;
  hideStats?: boolean;
}

function Section({ section, overrideTitle, maxItems = 8, numbered = false, hideStats = false }: SectionProps) {
  const items = section.items.slice(0, maxItems);
  const statsStr = !hideStats && section.stats?.length
    ? section.stats.map(s => `${s.value} ${s.label}`).join('  ·  ')
    : null;

  return (
    <div style={{ breakInside: 'avoid', marginBottom: 28 }}>
      <div style={sectionLabelStyle()}>
        <span>{overrideTitle ?? section.title}</span>
        {statsStr && (
          <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'none' }}>
            {statsStr}
          </span>
        )}
      </div>

      {section.narrative && (
        <p style={{ fontSize: 11, color: '#64748b', fontStyle: 'italic', margin: '0 0 10px 0', lineHeight: 1.55 }}>
          {section.narrative}
        </p>
      )}

      <div>
        {items.map((item, i) => (
          <ItemRow key={i} item={item} numbered={numbered} index={i} last={i === items.length - 1} />
        ))}
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

interface WeeklyReportViewProps {
  report: WeeklyReport;
}

export function WeeklyReportView({ report }: WeeklyReportViewProps) {
  const startLabel = fmt(report.config.startDate, { month: 'long', day: 'numeric', year: 'numeric' });
  const endLabel   = fmt(report.config.endDate,   { month: 'long', day: 'numeric', year: 'numeric' });
  const genLabel   = fmt(report.generatedAt,       { month: 'short', day: 'numeric', year: 'numeric' });
  const kpis       = getKPIs(report);

  // Partition sections into named slots
  const wins     = report.sections.find(s => s.id === 'wins');
  const losses   = report.sections.find(s => s.id === 'losses');
  const actions  = report.sections.find(s => s.id === 'action_items');
  const releases = report.sections.find(s => s.id === 'release_highlights');
  const rest     = report.sections.filter(s =>
    !['wins', 'losses', 'action_items', 'release_highlights'].includes(s.id)
  );

  return (
    <div style={{ background: 'white', fontFamily: FONT }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '48px 44px' }}>

        {/* ── Header ── */}
        <div style={{
          borderBottom: '2.5px solid #0f172a',
          paddingBottom: 24, marginBottom: 32,
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        }}>
          <div>
            <div style={{
              fontSize: 9, fontWeight: 800, letterSpacing: '0.3em',
              textTransform: 'uppercase', color: '#94a3b8', marginBottom: 8,
            }}>
              Artist OS · Performance Report
            </div>
            <div style={{
              fontSize: 34, fontWeight: 900, color: '#0f172a',
              lineHeight: 1, letterSpacing: '-0.02em',
            }}>
              {report.artistName}
            </div>
            <div style={{ fontSize: 14, color: '#64748b', marginTop: 8 }}>
              {startLabel} — {endLabel}
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '0.2em',
              textTransform: 'uppercase', color: '#94a3b8',
            }}>
              Date Generated
            </div>
            <div style={{ fontSize: 13, color: '#334155', marginTop: 4, fontWeight: 500 }}>
              {genLabel}
            </div>
          </div>
        </div>

        {/* ── Executive Summary ── */}
        {report.executiveSummary && (
          <div style={{ borderLeft: '3px solid #0f172a', paddingLeft: 18, marginBottom: 36 }}>
            <div style={{
              fontSize: 9, fontWeight: 800, letterSpacing: '0.28em',
              textTransform: 'uppercase', color: '#94a3b8', marginBottom: 10,
            }}>
              Executive Summary
            </div>
            <p style={{ fontSize: 14, color: '#1e293b', lineHeight: 1.65, margin: 0, fontWeight: 400 }}>
              {report.executiveSummary}
            </p>
          </div>
        )}

        {/* ── KPI Strip ── */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0',
          padding: '20px 0', marginBottom: 40,
        }}>
          {kpis.map((kpi, i) => (
            <div key={kpi.label} style={{
              textAlign: 'center',
              borderRight: i < kpis.length - 1 ? '1px solid #e2e8f0' : 'none',
              padding: '0 12px',
            }}>
              <div style={{
                fontSize: 40, fontWeight: 900, color: '#0f172a',
                lineHeight: 1, letterSpacing: '-0.02em',
              }}>
                {kpi.value}
              </div>
              <div style={{
                fontSize: 9, fontWeight: 700, letterSpacing: '0.2em',
                textTransform: 'uppercase', color: '#94a3b8', marginTop: 6,
              }}>
                {kpi.label}
              </div>
            </div>
          ))}
        </div>

        {/* ── Major Wins + Risks (2-column) ── */}
        {(wins || losses) && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginBottom: 4 }}>
            {wins && <Section section={wins} maxItems={6} />}
            {losses && <Section section={losses} maxItems={6} />}
          </div>
        )}

        {/* ── Recommended Next Actions (numbered) ── */}
        {actions && (
          <Section
            section={actions}
            overrideTitle="Recommended Next Actions"
            maxItems={6}
            numbered
            hideStats
          />
        )}

        {/* ── Release Highlights ── */}
        {releases && <Section section={releases} maxItems={6} />}

        {/* ── Remaining sections (task summary, content, sync) ── */}
        {rest.map(section => (
          <Section key={section.id} section={section} maxItems={5} />
        ))}

        {/* ── Footer ── */}
        <div style={{
          marginTop: 52, paddingTop: 14, borderTop: '1px solid #e2e8f0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 10, color: '#94a3b8' }}>
            {report.artistName} · Artist OS · Confidential
          </span>
          <span style={{ fontSize: 10, color: '#cbd5e1' }}>
            {report.id.replace('report-', '')}
          </span>
        </div>

      </div>
    </div>
  );
}
