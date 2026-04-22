/**
 * reportService — Weekly report aggregation + AI executive summary.
 *
 * buildWeeklyReport(config):
 *   - Fetches tasks, releases, goals, sync jobs, integrations from Supabase
 *   - Filters to the configured date range
 *   - Builds each enabled section with typed ReportItem arrays
 *   - Optionally calls Gemini for a 2-3 sentence executive summary
 *   - Returns a fully-typed WeeklyReport
 */

import {
  fetchTasks,
  fetchReleases,
  fetchGoals,
  fetchSyncJobs,
  fetchIntegrations,
} from '../lib/supabaseData';
import { ARTIST_INFO } from '../constants';
import type {
  WeeklyReport,
  WeeklyReportConfig,
  WeeklyReportSection,
  ReportItem,
  ReportSectionId,
} from '../types/domain';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function inRange(dateStr: string | null | undefined, start: Date, end: Date): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return d >= start && d <= end;
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

// ─── Section builders ─────────────────────────────────────────────────────────

type BuilderArgs = {
  tasks: Awaited<ReturnType<typeof fetchTasks>>;
  releases: Awaited<ReturnType<typeof fetchReleases>>;
  goals: Awaited<ReturnType<typeof fetchGoals>>;
  syncJobs: Awaited<ReturnType<typeof fetchSyncJobs>>;
  integrations: Awaited<ReturnType<typeof fetchIntegrations>>;
  start: Date;
  end: Date;
};

const TAG_POSITIVE = ['Goal hit', 'released', 'scheduled', 'mastered'] as const;

function buildWins({ tasks, releases, goals, start, end }: BuilderArgs): WeeklyReportSection {
  const completedTasks = tasks.filter(
    (t) => t.status === 'done' && inRange(t.completed_at ?? t.updated_at, start, end),
  );
  const releasedInPeriod = releases.filter(
    (r) =>
      (r.status === 'released' || r.status === 'scheduled') &&
      inRange(r.release_date, start, end),
  );
  const goalsHit = goals.filter(
    (g) => g.current_value != null && g.target_value != null && g.current_value >= g.target_value,
  );

  const items: ReportItem[] = [
    ...completedTasks.map((t) => ({
      text: t.title,
      meta: 'Task completed',
      status: 'positive' as const,
    })),
    ...releasedInPeriod.map((r) => ({
      text: r.title,
      meta: r.status === 'released' ? 'Released' : 'Scheduled',
      status: 'positive' as const,
      tag: r.status ?? undefined,
    })),
    ...goalsHit.map((g) => ({
      text: g.title,
      meta: `${g.current_value} / ${g.target_value}${g.unit ? ' ' + g.unit : ''}`,
      status: 'positive' as const,
      tag: 'Goal hit',
    })),
  ];

  return {
    id: 'wins',
    title: 'Wins This Week',
    items: items.length > 0 ? items : [{ text: 'No wins logged yet — keep going.', status: 'neutral' }],
    stats: [
      { label: 'Tasks completed', value: completedTasks.length },
      { label: 'Goals hit', value: goalsHit.length },
    ],
  };
}

function buildLosses({ tasks, end }: BuilderArgs): WeeklyReportSection {
  const overdueTasks = tasks.filter(
    (t) => t.status !== 'done' && t.due_date && new Date(t.due_date) < end,
  );
  const blockedTasks = tasks.filter((t) => t.status === 'blocked');

  const items: ReportItem[] = [
    ...overdueTasks.map((t) => ({
      text: t.title,
      meta: `Due ${t.due_date ? fmtDate(new Date(t.due_date)) : 'unknown'}`,
      status: 'negative' as const,
      tag: 'Overdue',
    })),
    ...blockedTasks.map((t) => ({
      text: t.title,
      meta: 'Blocked',
      status: 'warning' as const,
      tag: 'Blocked',
    })),
  ];

  return {
    id: 'losses',
    title: 'Challenges & Gaps',
    items:
      items.length > 0
        ? items
        : [{ text: 'No significant blockers this week.', status: 'positive' }],
    stats: [
      { label: 'Overdue tasks', value: overdueTasks.length },
      { label: 'Blocked tasks', value: blockedTasks.length },
    ],
  };
}

function buildContentPerformance(): WeeklyReportSection {
  return {
    id: 'content_performance',
    title: 'Content Performance',
    narrative: 'Connect your social accounts in Settings → Integrations to see post-level performance data here.',
    items: [
      {
        text: 'Content analytics will appear here once platform integrations are active.',
        status: 'neutral',
      },
    ],
  };
}

function buildReleaseHighlights({ releases }: BuilderArgs): WeeklyReportSection {
  const active = releases
    .filter((r) =>
      ['released', 'scheduled', 'mastered', 'ready'].includes(r.status ?? ''),
    )
    .slice(0, 8);

  const items: ReportItem[] =
    active.length > 0
      ? active.map((r) => ({
          text: r.title,
          meta: [
            r.status,
            r.release_date ? fmtDate(new Date(r.release_date)) : null,
          ]
            .filter(Boolean)
            .join(' · '),
          status: r.status === 'released' ? ('positive' as const) : ('neutral' as const),
          tag: r.status ?? undefined,
        }))
      : [{ text: 'No active releases in catalog.', status: 'neutral' }];

  const releasedCount = releases.filter((r) => r.status === 'released').length;
  const scheduledCount = releases.filter((r) => r.status === 'scheduled').length;

  return {
    id: 'release_highlights',
    title: 'Release Highlights',
    items,
    stats: [
      { label: 'Released', value: releasedCount },
      { label: 'Scheduled', value: scheduledCount },
    ],
  };
}

function buildTaskSummary({ tasks, start, end }: BuilderArgs): WeeklyReportSection {
  const created = tasks.filter((t) => inRange(t.created_at, start, end));
  const completed = tasks.filter(
    (t) => t.status === 'done' && inRange(t.completed_at ?? t.updated_at, start, end),
  );
  const inProgress = tasks.filter((t) => t.status === 'in_progress');
  const overdue = tasks.filter(
    (t) => t.status !== 'done' && t.due_date && new Date(t.due_date) < end,
  );
  const urgent = tasks
    .filter((t) => t.priority === 'urgent' && t.status !== 'done')
    .slice(0, 5);

  return {
    id: 'task_summary',
    title: 'Task Summary',
    items:
      urgent.length > 0
        ? urgent.map((t) => ({
            text: t.title,
            meta: `Priority: ${t.priority}`,
            status: 'warning' as const,
            tag: 'Urgent',
          }))
        : [{ text: 'No urgent open tasks.', status: 'positive' }],
    stats: [
      { label: 'Created', value: created.length },
      { label: 'Completed', value: completed.length },
      { label: 'In progress', value: inProgress.length },
      { label: 'Overdue', value: overdue.length },
    ],
  };
}

function buildActionItems({ tasks }: BuilderArgs): WeeklyReportSection {
  const open = tasks
    .filter((t) => t.status !== 'done')
    .sort(
      (a, b) =>
        (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3),
    )
    .slice(0, 8);

  return {
    id: 'action_items',
    title: 'Action Items',
    items:
      open.length > 0
        ? open.map((t) => ({
            text: t.title,
            meta: t.due_date ? `Due ${fmtDate(new Date(t.due_date))}` : 'No due date',
            status:
              t.priority === 'urgent'
                ? ('negative' as const)
                : t.priority === 'high'
                  ? ('warning' as const)
                  : ('neutral' as const),
            tag: t.priority,
          }))
        : [{ text: 'All caught up — no open action items.', status: 'positive' }],
  };
}

function buildSyncIssues({
  syncJobs,
  integrations,
  start,
  end,
}: BuilderArgs): WeeklyReportSection {
  const failedJobs = syncJobs.filter(
    (j) => j.status === 'failed' && inRange(j.created_at, start, end),
  );
  const errorIntegrations = integrations.filter(
    (i) => i.connection_status === 'error' || i.connection_status === 'expired',
  );

  const items: ReportItem[] = [
    ...failedJobs.map((j) => ({
      text: `Sync failed: ${j.provider} — ${j.job_type}`,
      meta: j.error_message ?? 'No error details',
      status: 'negative' as const,
      tag: 'Sync error',
    })),
    ...errorIntegrations.map((i) => ({
      text: `Integration issue: ${i.provider}`,
      meta: `Status: ${i.connection_status}`,
      status: 'warning' as const,
      tag: i.connection_status,
    })),
  ];

  return {
    id: 'sync_issues',
    title: 'Sync Issues & Anomalies',
    items:
      items.length > 0
        ? items
        : [{ text: 'No sync issues detected this week.', status: 'positive' }],
    stats: [
      { label: 'Failed syncs', value: failedJobs.length },
      { label: 'Broken integrations', value: errorIntegrations.length },
    ],
  };
}

const SECTION_BUILDERS: Record<
  ReportSectionId,
  (args: BuilderArgs) => WeeklyReportSection
> = {
  wins: buildWins,
  losses: buildLosses,
  content_performance: buildContentPerformance,
  release_highlights: buildReleaseHighlights,
  task_summary: buildTaskSummary,
  action_items: buildActionItems,
  sync_issues: buildSyncIssues,
};

// ─── Public API ───────────────────────────────────────────────────────────────

export async function buildWeeklyReport(
  config: WeeklyReportConfig,
): Promise<WeeklyReport> {
  const start = new Date(config.startDate);
  const end = new Date(config.endDate);
  end.setHours(23, 59, 59, 999);

  // Parallel data fetch
  const [tasks, releases, goals, syncJobs, integrations] = await Promise.all([
    fetchTasks().catch(() => [] as Awaited<ReturnType<typeof fetchTasks>>),
    fetchReleases().catch(() => [] as Awaited<ReturnType<typeof fetchReleases>>),
    fetchGoals().catch(() => [] as Awaited<ReturnType<typeof fetchGoals>>),
    fetchSyncJobs(50).catch(() => [] as Awaited<ReturnType<typeof fetchSyncJobs>>),
    fetchIntegrations().catch(
      () => [] as Awaited<ReturnType<typeof fetchIntegrations>>,
    ),
  ]);

  const builderArgs: BuilderArgs = { tasks, releases, goals, syncJobs, integrations, start, end };

  // Build only the requested sections, in order
  const sections: WeeklyReportSection[] = config.sections
    .map((id) => SECTION_BUILDERS[id]?.(builderArgs))
    .filter(Boolean) as WeeklyReportSection[];

  // AI executive summary — non-blocking optional step
  let executiveSummary: string | undefined;
  try {
    const digest = sections.map((s) => ({
      section: s.title,
      stats: s.stats,
      items: s.items.slice(0, 3).map((i) => `${i.status === 'positive' ? '✓' : i.status === 'negative' ? '✗' : '·'} ${i.text}`),
    }));
    const res = await fetch('/api/report/summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sections: digest,
        artistName: ARTIST_INFO.name,
        start: fmtDate(start),
        end: fmtDate(end),
      }),
    });
    if (res.ok) {
      const data = await res.json();
      executiveSummary = data.summary ?? undefined;
    }
  } catch {
    // AI summary is optional — never block report generation
  }

  return {
    id: `report-${Date.now()}`,
    config,
    generatedAt: new Date().toISOString(),
    artistName: ARTIST_INFO.name,
    sections,
    executiveSummary,
  };
}
