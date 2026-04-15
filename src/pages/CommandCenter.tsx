/**
 * CommandCenter — Action-first Artist OS homepage.
 *
 * Layout:
 *   ActionBar (heading + 3 CTA buttons)
 *   SinceLastLogin (full-width)
 *   2-column grid:
 *     Left:  TodaysPriorities → ActiveCampaigns
 *     Right: UpcomingContent  → QuickCapture
 *
 * Role-aware: artist sees content/release columns first;
 *             manager sees task/campaign columns first.
 */

import React, { useState, useCallback } from 'react';
import { QuickCapture } from '../components/QuickCapture';
import { ActionBar } from '../components/dashboard/ActionBar';
import { SinceLastLogin } from '../components/dashboard/SinceLastLogin';
import { TodaysPriorities } from '../components/dashboard/TodaysPriorities';
import { UpcomingContent } from '../components/dashboard/UpcomingContent';
import { ActiveCampaigns } from '../components/dashboard/ActiveCampaigns';
import { useDashboard, stampLoginTime } from '../hooks/useDashboard';
import { useCurrentUserRole } from '../hooks/useCurrentUserRole';
import { isManager } from '../types/roles';
// ─── CommandCenter ──────────────────────────────────────────────────────────

export function CommandCenter() {
  const role = useCurrentUserRole();
  const managerView = isManager(role);

  const { data, loading, refetch } = useDashboard();
  const [syncing, setSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);

  const handleSyncNow = useCallback(async () => {
    setSyncing(true);
    setSyncSuccess(false);
    try {
      // Trigger server-side analytics refresh if endpoint exists
      await fetch('/api/analytics/trigger', { method: 'POST' }).catch(() => {});
      await refetch();
      // Stamp the new login time after a successful sync
      stampLoginTime();
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 3000);
    } finally {
      setSyncing(false);
    }
  }, [refetch]);

  // Columns are role-aware:
  // Artist: Priorities + Campaigns on left; Content + Capture on right
  // Manager: same order, but "tasks" language is more prominent (handled in TodaysPriorities itself)
  const leftCol = (
    <div className="space-y-5">
      <TodaysPriorities
        items={data?.todayPriorities ?? []}
        loading={loading}
      />
      <ActiveCampaigns
        campaigns={data?.activeCampaigns ?? []}
        loading={loading}
      />
    </div>
  );

  const rightCol = (
    <div className="space-y-5">
      <UpcomingContent
        items={data?.upcomingItems ?? []}
        loading={loading}
      />
      <QuickCapture onSuccess={() => { refetch(); }} />
    </div>
  );

  return (
    <div className="space-y-6 pb-20">
      {/* Top action strip */}
      <ActionBar
        onSyncNow={handleSyncNow}
        syncing={syncing}
        syncSuccess={syncSuccess}
      />

      {/* Since last login — full width */}
      <SinceLastLogin
        delta={data?.sinceLastLogin ?? {
          newIdeas: 0,
          newTasks: 0,
          newEvents: 0,
          releaseChanges: 0,
          newContent: 0,
          lastLoginAt: null,
          items: [],
        }}
        loading={loading}
      />

      {/* Main 2-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {leftCol}
        {rightCol}
      </div>
    </div>
  );
}
