/**
 * ActiveCampaigns — Release campaigns in active phase with asset progress.
 */

import React from 'react';
import { Music, Flag, Clock, CheckCircle, Circle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { DashCard, DashSkeleton } from './DashCard';
import type { CampaignItem } from '../../hooks/useDashboard';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  scheduled:  'bg-blue-50   text-blue-600   border-blue-100',
  ready:      'bg-emerald-50 text-emerald-600 border-emerald-100',
  production: 'bg-orange-50  text-orange-600  border-orange-100',
  mastered:   'bg-purple-50  text-purple-600  border-purple-100',
};

function progressColor(pct: number): string {
  if (pct >= 80) return 'bg-emerald-500';
  if (pct >= 50) return 'bg-yellow-400';
  return 'bg-red-400';
}

// ─── Campaign Row ─────────────────────────────────────────────────────────────

function CampaignRow({ campaign }: { campaign: CampaignItem }) {
  const pct = campaign.assetsTotal > 0
    ? Math.round((campaign.assetsReady / campaign.assetsTotal) * 100)
    : 0;

  const badgeClass = STATUS_BADGE[campaign.status] ?? 'bg-slate-50 text-slate-500 border-slate-100';
  const trackColor = progressColor(pct);

  return (
    <li className="py-3 border-b border-border last:border-0">
      {/* Header row */}
      <div className="flex items-start gap-3">
        {campaign.coverUrl ? (
          <img
            src={campaign.coverUrl}
            alt={campaign.title}
            className="w-10 h-10 rounded-lg object-cover shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center shrink-0">
            <Music className="w-5 h-5 text-purple-500" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-sm font-semibold text-text-primary truncate">{campaign.title}</p>
            <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize shrink-0', badgeClass)}>
              {campaign.status}
            </span>
          </div>

          {/* Asset progress bar */}
          <div className="flex items-center gap-2 mt-1.5">
            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-500', trackColor)}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-[11px] text-text-tertiary whitespace-nowrap">
              {campaign.assetsReady}/{campaign.assetsTotal} assets
            </span>
          </div>
        </div>
      </div>

      {/* Milestone row */}
      {campaign.nextMilestone && (
        <div className="flex items-center gap-1.5 mt-2 pl-13">
          <Clock className="w-3 h-3 text-text-tertiary" />
          <span className="text-xs text-text-tertiary">{campaign.nextMilestone}</span>
        </div>
      )}
    </li>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

interface ActiveCampaignsProps {
  campaigns: CampaignItem[];
  loading?: boolean;
}

export function ActiveCampaigns({ campaigns, loading }: ActiveCampaignsProps) {
  const allReady = campaigns.every(c => c.assetsReady === c.assetsTotal);

  const headerAction = campaigns.length > 0 && (
    <div className="flex items-center gap-1.5">
      {allReady
        ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
        : <Circle className="w-3.5 h-3.5 text-text-tertiary" />}
      <span className="text-xs text-text-tertiary">
        {campaigns.length} active
      </span>
    </div>
  );

  return (
    <DashCard title="Active Campaigns" action={headerAction}>
      {loading ? (
        <DashSkeleton rows={3} />
      ) : campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
          <Flag className="w-8 h-8 text-border" />
          <p className="text-sm text-text-tertiary">No active campaigns right now.</p>
          <p className="text-xs text-text-tertiary">Add a release to start a campaign.</p>
        </div>
      ) : (
        <ul>
          {campaigns.map(c => <CampaignRow key={c.id} campaign={c} />)}
        </ul>
      )}
    </DashCard>
  );
}
