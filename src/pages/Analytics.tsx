import React, { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, BarChart3, Disc3, Users } from 'lucide-react';
import { fetchReleases, fetchSyncJobs } from '../lib/supabaseData';
import { soundchartsProvider } from '../services/analytics/soundchartsProvider';
import { songstatsProvider } from '../services/analytics/songstatsProvider';
import { spotifyProvider } from '../services/analytics/spotifyProvider';
import type { AnalyticsProviderState, ReleaseRecord, SyncJob } from '../types/domain';

export function Analytics() {
  const [providerStates, setProviderStates] = useState<AnalyticsProviderState[]>([]);
  const [releases, setReleases] = useState<ReleaseRecord[]>([]);
  const [syncJobs, setSyncJobs] = useState<SyncJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [states, releaseRows, jobs] = await Promise.all([
          Promise.all([
            spotifyProvider.getState(),
            songstatsProvider.getState(),
            soundchartsProvider.getState(),
          ]),
          fetchReleases(),
          fetchSyncJobs(),
        ]);

        setProviderStates(states);
        setReleases(releaseRows);
        setSyncJobs(jobs);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const failedJobs = useMemo(() => syncJobs.filter((job) => job.status === 'failed').slice(0, 4), [syncJobs]);

  return (
    <div className="space-y-8 pb-20">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-text-tertiary">Analytics foundation</p>
        <h1 className="mt-2 text-4xl font-bold text-text-primary">Provider-agnostic analytics</h1>
        <p className="mt-2 max-w-3xl text-text-secondary">
          This page no longer performs brittle direct fetch parsing. Provider state, sync attribution, and typed sections are separated from the UI so future Spotify, Songstats, Soundcharts, and playlist intelligence can slot in safely.
        </p>
      </header>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[2rem] border border-border bg-white p-5 shadow-sm">
          <Activity className="h-5 w-5 text-text-tertiary" />
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">Overview cards</p>
          <p className="mt-2 text-3xl font-bold text-text-primary">{providerStates.length}</p>
          <p className="mt-2 text-sm text-text-secondary">Provider contracts defined</p>
        </div>
        <div className="rounded-[2rem] border border-border bg-white p-5 shadow-sm">
          <Disc3 className="h-5 w-5 text-text-tertiary" />
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">Release performance</p>
          <p className="mt-2 text-3xl font-bold text-text-primary">{releases.length}</p>
          <p className="mt-2 text-sm text-text-secondary">Release rows available for metrics and playlisting</p>
        </div>
        <div className="rounded-[2rem] border border-border bg-white p-5 shadow-sm">
          <Users className="h-5 w-5 text-text-tertiary" />
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">Audience growth</p>
          <p className="mt-2 text-3xl font-bold text-text-primary">Ready</p>
          <p className="mt-2 text-sm text-text-secondary">Section shell prepared for audience domain metrics</p>
        </div>
        <div className="rounded-[2rem] border border-border bg-white p-5 shadow-sm">
          <BarChart3 className="h-5 w-5 text-text-tertiary" />
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">Playlisting</p>
          <p className="mt-2 text-3xl font-bold text-text-primary">TBD</p>
          <p className="mt-2 text-sm text-text-secondary">Waiting on provider data, not fake chart assumptions</p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[2rem] border border-border bg-white p-6 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">Source attribution</p>
          <h2 className="mt-2 text-2xl font-bold text-text-primary">Provider states</h2>
          <div className="mt-5 space-y-3">
            {loading ? (
              <p className="text-sm text-text-secondary">Loading providers...</p>
            ) : (
              providerStates.map((provider) => (
                <div key={provider.provider} className="rounded-2xl border border-border px-4 py-3">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold capitalize text-text-primary">{provider.provider}</p>
                    <span className={`badge ${provider.status === 'ready' ? 'badge-success' : provider.status === 'error' ? 'badge-error' : 'badge-warning'}`}>
                      {provider.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-text-secondary">{provider.errorMessage || 'Provider ready.'}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[2rem] border border-border bg-white p-6 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">Typed empty states</p>
            <h2 className="mt-2 text-2xl font-bold text-text-primary">No provider configured</h2>
            <p className="mt-3 text-sm leading-6 text-text-secondary">
              Each section now expects a provider contract and can explicitly render not-configured or provider-error states instead of attempting to parse whatever came back from a fetch call.
            </p>
          </div>
          <div className="rounded-[2rem] border border-border bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-text-tertiary" />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">Sync issues</p>
                <h2 className="mt-1 text-2xl font-bold text-text-primary">Recent failures</h2>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {failedJobs.length === 0 ? (
                <p className="text-sm text-text-secondary">No sync failures logged.</p>
              ) : (
                failedJobs.map((job) => (
                  <div key={job.id} className="rounded-2xl bg-rose-50 px-4 py-3">
                    <p className="font-semibold capitalize text-rose-900">{job.provider}</p>
                    <p className="mt-1 text-sm text-rose-800">{job.error_message || 'Unknown sync error'}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
