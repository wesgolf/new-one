/**
 * AnalyticsDashboard — tabbed shell with Music + Social Media analytics.
 *
 * - Music tab: Songstats / Spotify / SoundCloud / Apple Music / YouTube + DJ platforms
 * - Social tab: Zernio (Instagram, TikTok, YouTube) + Songstats social signals
 *
 * Both tabs are fully interactive (search, filter chips, click-to-focus,
 * sortable tables, synchronized donut highlights).
 */
import React, { useState } from 'react';
import { Headphones, Share2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { MusicAnalyticsView } from './analytics/MusicAnalyticsView';
import { SocialAnalyticsView } from './analytics/SocialAnalyticsView';

type Tab = 'music' | 'social';

export const AnalyticsDashboard: React.FC = () => {
  const [tab, setTab] = useState<Tab>('music');

  return (
    <div className="space-y-6">
      {/* Page header */}
      <header>
        <h2 className="text-3xl font-bold tracking-tight text-text-primary md:text-4xl">
          Analytics
        </h2>
        <p className="mt-1 text-text-secondary">
          {tab === 'music'
            ? 'Streaming, playlisting and chart performance across your music platforms.'
            : 'Engagement, audience and content performance across your social channels.'}
        </p>
      </header>

      {/* Tabs */}
      <div className="inline-flex items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
        <TabButton active={tab === 'music'}  onClick={() => setTab('music')}  icon={<Headphones className="h-4 w-4" />} label="Music Analytics" />
        <TabButton active={tab === 'social'} onClick={() => setTab('social')} icon={<Share2     className="h-4 w-4" />} label="Social Media" />
      </div>

      {tab === 'music'  && <MusicAnalyticsView  />}
      {tab === 'social' && <SocialAnalyticsView />}
    </div>
  );
};

function TabButton({
  active, onClick, icon, label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-black transition-all',
        active
          ? 'bg-slate-900 text-white shadow-sm'
          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900',
      )}
    >
      {icon}
      {label}
    </button>
  );
}
