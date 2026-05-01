import React, { useCallback, useEffect, useState } from 'react';
import {
  Loader2,
  Plug2,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { settingsService } from '../../services/settingsService';
import type { IntegrationsSettings, IntegrationPlatformKey } from '../../types/domain';
import { DEFAULT_INTEGRATIONS_SETTINGS } from '../../types/domain';
import { cn } from '../../lib/utils';
import { ARTIST_INFO } from '../../constants';
import { env } from '../../lib/envConfig';
import { fetchArtistStats } from '../../lib/songstatsService';
import { fetchServerJsonWithFallback } from '../../lib/serverApi';
import { getSpotifyToken, redirectToSpotifyAuth } from '../../lib/spotify';
import { SettingsCard, SettingsFieldRow, SettingsLoadingSkeleton, SettingsSectionHeader } from './SettingsPrimitives';

// ─── Platform metadata ────────────────────────────────────────────────────────

const PROVIDER_META: Record<
  IntegrationPlatformKey,
  {
    label: string;
    shortDescription: string;
  }
> = {
  zernio: {
    label: 'Zernio',
    shortDescription: 'Social analytics',
  },
  songstats: {
    label: 'Songstats',
    shortDescription: 'Streaming stats',
  },
  soundcloud: {
    label: 'SoundCloud',
    shortDescription: 'Artist tracks',
  },
  spotify: {
    label: 'Spotify',
    shortDescription: 'Catalog sync',
  },
};

const ALL_PLATFORMS = Object.keys(PROVIDER_META) as IntegrationPlatformKey[];

const SYNC_INTERVALS: { value: number; label: string }[] = [
  { value: 900,   label: '15 min'  },
  { value: 1800,  label: '30 min'  },
  { value: 3600,  label: '1 hour'  },
  { value: 21600, label: '6 hours' },
  { value: 86400, label: 'Daily'   },
];

type ManualPullState = {
  status: 'idle' | 'running' | 'success' | 'error';
  message: string | null;
  ranAt: string | null;
};

const INITIAL_PULL_STATE: Record<IntegrationPlatformKey, ManualPullState> = {
  zernio: { status: 'idle', message: null, ranAt: null },
  songstats: { status: 'idle', message: null, ranAt: null },
  soundcloud: { status: 'idle', message: null, ranAt: null },
  spotify: { status: 'idle', message: null, ranAt: null },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function IntegrationsSettingsPanel() {
  const [settings, setSettings] = useState<IntegrationsSettings>(
    () => sanitizeIntegrationsSettings(
      settingsService.getCachedSettingsByCategory('integrations') ?? DEFAULT_INTEGRATIONS_SETTINGS,
    ),
  );
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [saving,   setSaving]   = useState<string | null>(null);
  const [pullState, setPullState] = useState<Record<IntegrationPlatformKey, ManualPullState>>(INITIAL_PULL_STATE);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [settingsResult, integrationRowsResult] = await Promise.all([
        settingsService.integrations.get(),
        supabase
          .from('integrations')
          .select('platform,last_processed_at,status,last_error')
          .order('updated_at', { ascending: false }),
      ]);

      const data = sanitizeIntegrationsSettings(settingsResult);
      setSettings(data);

      const rows = integrationRowsResult.data ?? [];
      const lookup = Object.fromEntries(rows.map((row) => [row.platform, row])) as Record<string, any>;
      setPullState({
        zernio: { status: 'idle', message: lookup.zernio?.last_error ?? null, ranAt: lookup.zernio?.last_processed_at ?? null },
        songstats: { status: 'idle', message: lookup.songstats?.last_error ?? null, ranAt: lookup.songstats?.last_processed_at ?? null },
        soundcloud: { status: 'idle', message: lookup.soundcloud?.last_error ?? null, ranAt: lookup.soundcloud?.last_processed_at ?? null },
        spotify: { status: 'idle', message: lookup.spotify?.last_error ?? null, ranAt: lookup.spotify?.last_processed_at ?? null },
      });
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load integration settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = useCallback(async <K extends keyof IntegrationsSettings>(
    key: K,
    value: IntegrationsSettings[K],
  ) => {
    setSaving(key);
    setSettings(prev => ({ ...prev, [key]: value }));
    try {
      await settingsService.integrations.update(key, value);
    } catch {
      setSettings(prev => ({ ...prev, [key]: settings[key] }));
    } finally {
      setSaving(null);
    }
  }, [settings]);

  const runManualPull = useCallback(async (platform: IntegrationPlatformKey) => {
    console.group(`[Integrations] Manual pull started: ${platform}`);
    console.log('[Integrations] Current last-ran state:', pullState[platform]);
    setPullState(prev => ({
      ...prev,
      [platform]: { status: 'running', message: 'Running API pull...', ranAt: prev[platform].ranAt },
    }));

    try {
      let message = 'API pull completed.';

      if (platform === 'zernio') {
        console.log('[Integrations][Zernio] Fetching /api/zernio/accounts');
        const data = await fetchServerJsonWithFallback<any>(
          '/api/zernio/accounts',
          'zernio/accounts',
        );
        const count = Array.isArray(data) ? data.length : Array.isArray(data?.accounts) ? data.accounts.length : 0;
        console.log('[Integrations][Zernio] Account count:', count);
        message = `Fetched ${count} Zernio account${count === 1 ? '' : 's'}.`;
      }

      if (platform === 'songstats') {
        const songstatsArtistId = String(env.songstatsArtistId ?? '').trim();
        console.log('[Integrations][Songstats] Artist id:', songstatsArtistId || '(server env fallback)');
        const data = songstatsArtistId
          ? await fetchArtistStats(songstatsArtistId, 'all')
          : { stats: [] };
        const count = Array.isArray(data.stats) ? data.stats.length : 0;
        console.log('[Integrations][Songstats] Source count from /artists/stats:', count);
        message = `Fetched ${count} sources.`;
      }

      if (platform === 'soundcloud') {
        const token = typeof window !== 'undefined' ? localStorage.getItem('soundcloud_token') : null;
        console.log('[Integrations][SoundCloud] OAuth token present:', Boolean(token));
        let tracks: any[] = [];

        if (token) {
          try {
            console.log('[Integrations][SoundCloud] Fetching authenticated /api/soundcloud/me/tracks');
            const response = await fetch('/api/soundcloud/me/tracks?limit=25&linked_partitioning=1', {
              headers: { Authorization: `OAuth ${token}` },
            });
            console.log('[Integrations][SoundCloud] Authenticated response status:', response.status, response.statusText);
            if (!response.ok) {
              if (response.status === 401 && typeof window !== 'undefined') {
                console.warn('[Integrations][SoundCloud] OAuth token rejected; clearing localStorage token and falling back to public profile route.');
                localStorage.removeItem('soundcloud_token');
              }
              throw new Error(`SoundCloud API returned ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            tracks = Array.isArray(data?.collection) ? data.collection : Array.isArray(data) ? data : [];
            console.log('[Integrations][SoundCloud] Authenticated track count:', tracks.length);
          } catch (tokenErr: any) {
            console.warn('[Integrations][SoundCloud] Authenticated track fetch failed; falling back to public profile route.', {
              message: tokenErr?.message ?? String(tokenErr),
            });
          }
        }

        if (tracks.length === 0) {
          const profileUrl = ARTIST_INFO.soundcloud_url?.trim();
          if (!profileUrl) {
            throw new Error('Missing SoundCloud artist URL.');
          }
          console.log('[Integrations][SoundCloud] Fetching public profile URL:', profileUrl);
          const data = await fetchServerJsonWithFallback<{ tracks?: any[] }>(
            `/api/soundcloud/public-tracks?url=${encodeURIComponent(profileUrl)}&limit=200`,
            `soundcloud-public-tracks?url=${encodeURIComponent(profileUrl)}&limit=200`,
          );
          tracks = Array.isArray(data?.tracks) ? data.tracks : [];
          console.log('[Integrations][SoundCloud] Public track count:', tracks.length);
        }

        message = `Fetched ${tracks.length} tracks.`;
      }

      if (platform === 'spotify') {
        const token = await getSpotifyToken();
        console.log('[Integrations][Spotify] Access token present:', Boolean(token));
        if (!token) {
          redirectToSpotifyAuth();
          throw new Error('Opened Spotify auth popup. Finish login, then run Pull now again.');
        }

        const artistIds = ARTIST_INFO.spotify_ids
          .map((value) => String(value || '').trim())
          .filter(Boolean);
        console.log('[Integrations][Spotify] Resolved artist IDs from config:', artistIds);
        if (!artistIds.length) {
          throw new Error('Missing Spotify artist ID. Set VITE_SPOTIFY_ARTIST_ID / VITE_SPOTIFY_ARTIST_ID_2, or VITE_SPOTIFY_IDS in env.');
        }

        message = `Spotify authentication succeeded for ${artistIds.length} artist ID${artistIds.length === 1 ? '' : 's'}.`;
      }

      const ranAt = new Date().toISOString();
      console.log('[Integrations] Manual pull succeeded:', { platform, message, ranAt });
      setPullState(prev => ({
        ...prev,
        [platform]: { status: 'success', message, ranAt },
      }));
      void persistIntegrationState(platform, ranAt, null, 'healthy');
    } catch (err: any) {
      console.error('[Integrations] Manual pull failed:', {
        platform,
        name: err?.name ?? null,
        message: err?.message ?? 'Manual API pull failed.',
        stack: err?.stack ?? null,
      });
      setPullState(prev => ({
        ...prev,
        [platform]: {
          status: 'error',
          message: err?.message ?? 'Manual API pull failed.',
          ranAt: new Date().toISOString(),
        },
      }));
      void persistIntegrationState(platform, new Date().toISOString(), err?.message ?? 'Manual API pull failed.', 'error');
    } finally {
      console.groupEnd();
    }
  }, [pullState]);

  if (loading) return <SettingsLoadingSkeleton />;

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <p className="text-sm text-error">{error}</p>
        <button
          type="button"
          onClick={load}
          className="flex items-center gap-2 text-xs font-semibold text-brand hover:text-brand-hover transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <SettingsSectionHeader
        Icon={Plug2}
        title="Integrations"
        description="Manage the data providers and APIs Artist OS pulls from."
      />

      {/* ── Sync config ──────────────────────────────────── */}
      <SettingsCard title="Sync">
        <SettingsFieldRow
          label="Auto-sync"
          description="Automatically pull the latest data from configured providers."
          saving={saving === 'auto_sync'}
        >
          <AutoSyncToggle
            checked={settings.auto_sync}
            onChange={v => save('auto_sync', v)}
          />
        </SettingsFieldRow>

        <SettingsFieldRow
          label="Sync interval"
          description="How often to pull data when auto-sync is enabled."
          saving={saving === 'sync_interval'}
        >
          <div className="flex items-center gap-1.5 flex-wrap">
            {SYNC_INTERVALS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                disabled={!settings.auto_sync}
                onClick={() => save('sync_interval', value)}
                className={cn(
                  'px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all',
                  !settings.auto_sync && 'opacity-40 cursor-not-allowed',
                  settings.sync_interval === value
                    ? 'bg-brand text-white border-brand shadow-sm'
                    : 'border-border text-text-secondary hover:border-brand/40 hover:text-brand',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </SettingsFieldRow>
      </SettingsCard>

      {/* ── Enabled platforms ────────────────────────────── */}
      <SettingsCard title="Enabled APIs">
        <div className="px-5 py-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {ALL_PLATFORMS.map(platform => {
              const meta = PROVIDER_META[platform];
              const state = pullState[platform];
              const lastRun = state.ranAt ? formatRunTime(state.ranAt).replace('Last run ', '') : 'Not run yet';

              return (
                <div
                  key={platform}
                  className="flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-white px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold text-text-primary">
                      {meta.label}
                    </h3>
                    <p className="mt-0.5 text-sm text-text-tertiary">
                      {meta.shortDescription}
                    </p>
                    <p className="mt-1.5 text-sm text-text-secondary">
                      <span className="font-medium text-text-primary">Last ran:</span> {lastRun}
                    </p>
                    {state.message && (
                      <p
                        className={cn(
                          'mt-1 text-[11px]',
                          state.status === 'success' && 'text-emerald-700',
                          state.status === 'error' && 'text-red-600',
                          state.status === 'running' && 'text-text-secondary',
                        )}
                      >
                        {state.message}
                      </p>
                    )}
                  </div>

                  <div className="shrink-0">
                    <button
                      type="button"
                      onClick={() => runManualPull(platform)}
                      disabled={state.status === 'running'}
                      className={cn(
                        'inline-flex min-w-[104px] items-center justify-center gap-2 rounded-lg bg-black px-3 py-2 text-sm font-semibold text-white transition-all',
                        'hover:bg-zinc-800',
                        state.status === 'running' && 'cursor-wait opacity-70',
                      )}
                    >
                      {state.status === 'running'
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <RefreshCw className="h-4 w-4" />}
                      Pull now
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </SettingsCard>
    </div>
  );
}

function sanitizeIntegrationsSettings(value: IntegrationsSettings): IntegrationsSettings {
  const enabled = value.enabled_platforms.filter((platform): platform is IntegrationPlatformKey =>
    ALL_PLATFORMS.includes(platform as IntegrationPlatformKey),
  );

  return {
    ...value,
    enabled_platforms: enabled.length ? enabled : DEFAULT_INTEGRATIONS_SETTINGS.enabled_platforms,
  };
}

function formatRunTime(iso: string) {
  const date = new Date(iso);
  return `Last run ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
}
async function persistIntegrationState(
  platform: IntegrationPlatformKey,
  ranAt: string,
  lastError: string | null,
  status: 'healthy' | 'error' | 'pending' | 'disabled',
) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user?.id) return;

  const payload = {
    user_id: session.user.id,
    platform,
    last_processed_at: ranAt,
    is_scheduled: true,
    status,
    last_error_at: lastError ? ranAt : null,
    last_error: lastError,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('integrations').upsert(payload, {
    onConflict: 'user_id,platform',
  });

  if (error) {
    console.error('[Integrations] Failed to persist integration state:', {
      platform,
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
  }
}

// ─── Auto-sync toggle ─────────────────────────────────────────────────────────

function AutoSyncToggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent',
        'transition-colors duration-200 ease-in-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1',
        checked ? 'bg-brand' : 'bg-border',
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ease-in-out',
          checked ? 'translate-x-4' : 'translate-x-0',
        )}
      />
    </button>
  );
}
