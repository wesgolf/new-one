/**
 * CommandCenter — Action-first dashboard homepage.
 *
 * Layout:
 *   - ActionBar  (Generate Report | Sync Now | AI Assistant)
 *   - Role-aware grid:
 *       Artist:  SinceLastLogin + TodaysPriorities + ActiveCampaigns  |  UpcomingContent
 *       Manager: TodaysPriorities (wide) + SinceLastLogin + ActiveCampaigns  |  UpcomingContent
 */
import React, { useState, useCallback } from 'react';
import { NavLink } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useDashboard } from '../hooks/useDashboard';
import { useCurrentUserRole } from '../hooks/useCurrentUserRole';
import { ActionBar } from '../components/dashboard/ActionBar';
import { SinceLastLogin } from '../components/dashboard/SinceLastLogin';
import { TodaysPriorities } from '../components/dashboard/TodaysPriorities';
import { UpcomingContent } from '../components/dashboard/UpcomingContent';
import { ActiveCampaigns } from '../components/dashboard/ActiveCampaigns';
import { DashCard } from '../components/dashboard/DashCard';
import { MyTasksWidget } from '../components/dashboard/MyTasksWidget';
import { useAssistantContext } from '../context/AssistantContext';
import { syncService } from '../services/syncService';
import type { SinceLastLoginDelta } from '../hooks/useDashboard';
import { loadCachedGeneralSettings, subscribeToGeneralSettings } from '../lib/generalSettingsRuntime';
import { cn } from '../lib/utils';

// ─── Constants ────────────────────────────────────────────────────────────────

const EMPTY_DELTA: SinceLastLoginDelta = {
  newIdeas: 0, newTasks: 0, newEvents: 0, releaseChanges: 0,
  newContent: 0, completedGoals: 0, ideaStatusChanges: 0, newReleases: 0,
  insights: [], lastLoginAt: null, items: [],
};

const MANAGER_LINKS = [
  { label: 'Outreach pipeline', to: '/network',   description: 'Contacts & opportunities'   },
  { label: 'Release tracker',   to: '/releases',  description: 'All releases & assets'      },
  { label: 'Analytics',         to: '/analytics', description: 'Streams, reach, engagement' },
  { label: 'Goals',             to: '/goals',     description: 'Milestones & targets'       },
];

function ManagerLinks() {
  return (
    <DashCard title="Quick Access" compact>
      <ul className="space-y-1">
        {MANAGER_LINKS.map(({ label, to, description }) => (
          <li key={to}>
            <NavLink
              to={to}
              className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-raised transition-colors group"
            >
              <div>
                <p className="text-sm font-semibold text-text-primary">{label}</p>
                <p className="text-xs text-text-muted">{description}</p>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-border group-hover:text-brand transition-colors shrink-0" />
            </NavLink>
          </li>
        ))}
      </ul>
    </DashCard>
  );
}

const ARTIST_LINKS = [
  { label: 'Capture idea',   to: '/ideas',   description: 'Log a new track / song concept' },
  { label: 'Content engine', to: '/content', description: 'Draft & schedule posts'         },
  { label: 'Coach',          to: '/coach',   description: 'AI strategy & feedback'         },
];

function ArtistLinks() {
  return (
    <DashCard title="Jump to" compact>
      <ul className="space-y-1">
        {ARTIST_LINKS.map(({ label, to, description }) => (
          <li key={to}>
            <NavLink
              to={to}
              className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-raised transition-colors group"
            >
              <div>
                <p className="text-sm font-semibold text-text-primary">{label}</p>
                <p className="text-xs text-text-muted">{description}</p>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-border group-hover:text-brand transition-colors shrink-0" />
            </NavLink>
          </li>
        ))}
      </ul>
    </DashCard>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function CommandCenter() {
  const { data, loading, error, refetch } = useDashboard();
  const { isManager } = useCurrentUserRole();
  const { setOpen: setAssistantOpen } = useAssistantContext();
  const [dashboardLayout, setDashboardLayout] = useState(loadCachedGeneralSettings().dashboard_layout);

  const [syncing,     setSyncing]     = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [syncError,   setSyncError]   = useState<string | null>(null);

  const handleSyncNow = useCallback(async () => {
    setSyncing(true);
    setSyncSuccess(false);
    setSyncError(null);
    try {
      // Run provider syncs + dashboard refresh in parallel
      const [syncSettled] = await Promise.allSettled([
        syncService.syncNow('all'),
        refetch(),
      ]);

      if (syncSettled.status === 'fulfilled') {
        const failed = syncSettled.value.filter(r => !r.ok && r.error);
        if (failed.length > 0) {
          setSyncError(failed.map(r => `${r.provider}: ${r.error}`).join(' · '));
        } else {
          setSyncSuccess(true);
          setTimeout(() => setSyncSuccess(false), 2500);
        }
      } else {
        setSyncError(syncSettled.reason?.message ?? 'Sync failed');
      }
    } finally {
      setSyncing(false);
    }
  }, [refetch]);

  const delta         = data?.sinceLastLogin  ?? EMPTY_DELTA;
  const todayItems    = data?.todayPriorities ?? [];
  const upcomingItems = data?.upcomingItems   ?? [];
  const campaigns     = data?.activeCampaigns ?? [];

  React.useEffect(() => {
    return subscribeToGeneralSettings((settings) => {
      setDashboardLayout(settings.dashboard_layout);
    });
  }, []);

  const shellClass =
    dashboardLayout === 'compact'
      ? 'mx-auto max-w-5xl gap-5'
      : dashboardLayout === 'expanded'
      ? 'mx-auto max-w-none gap-7'
      : 'mx-auto max-w-6xl gap-6';

  return (
    <div className={cn('flex flex-col', shellClass)}>
      {/* Action bar */}
      <ActionBar
        onSyncNow={handleSyncNow}
        onAIAssistant={() => setAssistantOpen(true)}
        syncing={syncing}
        syncSuccess={syncSuccess}
      />

      {/* Top-level error */}
      {error && !data && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error} —{' '}
          <button onClick={refetch} className="font-semibold underline underline-offset-2">
            retry
          </button>
        </div>
      )}

      {/* Sync error — shown when one or more providers failed */}
      {syncError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
          <span className="font-semibold shrink-0">Sync issue:</span>
          <span>{syncError}</span>
          <button
            onClick={() => setSyncError(null)}
            className="ml-auto text-amber-600 hover:text-amber-800 transition-colors shrink-0"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      {/* Manager layout — priorities first */}
      {isManager ? (
        <>
          <TodaysPriorities items={todayItems} loading={loading} />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 flex flex-col gap-6">
              <SinceLastLogin delta={delta} todayItems={todayItems} upcomingItems={upcomingItems} loading={loading} />
              <ActiveCampaigns campaigns={campaigns} loading={loading} />
            </div>
            <div className="flex flex-col gap-6">
              <UpcomingContent items={upcomingItems} loading={loading} />
              <MyTasksWidget />
              <ManagerLinks />
            </div>
          </div>
        </>
      ) : (
        /* Artist layout — releases/content/ideas emphasis */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col gap-6">
            <SinceLastLogin delta={delta} todayItems={todayItems} upcomingItems={upcomingItems} loading={loading} />
            <TodaysPriorities items={todayItems} loading={loading} />
            <ActiveCampaigns campaigns={campaigns} loading={loading} />
          </div>
          <div className="flex flex-col gap-6">
            <UpcomingContent items={upcomingItems} loading={loading} />
            <MyTasksWidget />
            <ArtistLinks />
          </div>
        </div>
      )}

      {/* AI assistant — now global via Layout, just trigger open */}
    </div>
  );
}
