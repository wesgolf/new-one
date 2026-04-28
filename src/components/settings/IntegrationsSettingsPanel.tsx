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
import { fetchArtistCatalog, fetchArtistStats, fetchTrackInfo, fetchTrackStats, type ArtistCatalogTrack } from '../../lib/songstatsService';
import { fetchReleases, saveRelease } from '../../lib/supabaseData';
import { fetchServerJsonWithFallback } from '../../lib/serverApi';
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
};

const SHARED_RUNS_KEY = 'integration_api_runs';

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
      const [settingsResult, sharedRunsResult] = await Promise.all([
        settingsService.integrations.get(),
        supabase.from('app_settings').select('value').eq('key', SHARED_RUNS_KEY).maybeSingle(),
      ]);

      const data = sanitizeIntegrationsSettings(settingsResult);
      setSettings(data);

      const sharedRuns = readSharedRuns(sharedRunsResult.data?.value);
      setPullState({
        zernio: { status: 'idle', message: null, ranAt: sharedRuns.zernio ?? null },
        songstats: { status: 'idle', message: null, ranAt: sharedRuns.songstats ?? null },
        soundcloud: { status: 'idle', message: null, ranAt: sharedRuns.soundcloud ?? null },
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
        if (!env.songstatsArtistId) {
          throw new Error('Missing VITE_SONGSTATS_ARTIST_ID.');
        }
        console.log('[Integrations][Songstats] Artist id:', env.songstatsArtistId);
        const data = await fetchArtistStats(env.songstatsArtistId, 'all');
        const count = Array.isArray(data.stats) ? data.stats.length : 0;
        console.log('[Integrations][Songstats] Source count from /artists/stats:', count);
        const sync = await syncSongstatsReleases(env.songstatsArtistId);
        console.log('[Integrations][Songstats] Sync result:', sync);
        message = `Fetched ${count} sources. Updated ${sync.updated} release${sync.updated === 1 ? '' : 's'}${sync.skipped ? `, skipped ${sync.skipped}` : ''}.`;
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

        const sync = await syncSoundCloudReleases(tracks);
        console.log('[Integrations][SoundCloud] Sync result:', sync);
        message = `Fetched ${tracks.length} tracks. ${sync.created} created, ${sync.updated} updated${sync.skipped ? `, ${sync.skipped} skipped` : ''}.`;
      }

      const ranAt = new Date().toISOString();
      console.log('[Integrations] Manual pull succeeded:', { platform, message, ranAt });
      setPullState(prev => ({
        ...prev,
        [platform]: { status: 'success', message, ranAt },
      }));
      void persistSharedRun(platform, ranAt);
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
    } finally {
      console.groupEnd();
    }
  }, []);

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

type SharedRuns = Partial<Record<IntegrationPlatformKey, string>>;

function readSharedRuns(value: unknown): SharedRuns {
  if (!value || typeof value !== 'object') return {};
  const raw = value as Record<string, unknown>;
  const runs: SharedRuns = {};
  for (const platform of ALL_PLATFORMS) {
    if (typeof raw[platform] === 'string') {
      runs[platform] = raw[platform] as string;
    }
  }
  return runs;
}

async function persistSharedRun(platform: IntegrationPlatformKey, ranAt: string) {
  const { data } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', SHARED_RUNS_KEY)
    .maybeSingle();

  const current = readSharedRuns(data?.value);
  const next = { ...current, [platform]: ranAt };

  await supabase
    .from('app_settings')
    .upsert({ key: SHARED_RUNS_KEY, value: next }, { onConflict: 'key' });
}

function normalizeReleaseTitle(value: string | null | undefined) {
  return String(value || '')
    .toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, '')
    .replace(/[-–—]+/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function soundCloudSlug(value: string | null | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.pathname.split('/').filter(Boolean).slice(1).join('/').toLowerCase();
  } catch {
    return String(value).trim().replace(/^\/+/, '').toLowerCase();
  }
}

async function syncSoundCloudReleases(tracks: any[]) {
  console.group('[Integrations][SoundCloud] syncSoundCloudReleases');
  console.log('[Integrations][SoundCloud] Incoming track count:', tracks.length);

  const buildSyncError = (prefix: string, payload: any, status?: number) => {
    const detail =
      payload?.error ||
      payload?.message ||
      payload?.details?.error ||
      payload?.details?.message ||
      null;
    const suffix = status ? ` (HTTP ${status})` : '';
    return new Error(detail ? `${prefix}${suffix}: ${detail}` : `${prefix}${suffix}`);
  };

  // First try server-side sync to bypass Supabase RLS issues. Falls back to client-side upsert.
  try {
    const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
    if (sessionErr) {
      console.warn('[Integrations][SoundCloud] supabase.auth.getSession error:', sessionErr.message);
    }
    const token = sessionData?.session?.access_token ?? null;
    console.log('[Integrations][SoundCloud] Access token present:', Boolean(token));
    if (token) {
      console.log('[Integrations][SoundCloud] Calling server sync endpoint: /api/integrations/soundcloud/sync-releases');
      const payload = await fetchServerJsonWithFallback<any>(
        '/api/integrations/soundcloud/sync-releases',
        'soundcloud-sync-releases',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ tracks }),
        },
      );
      console.log('[Integrations][SoundCloud] Server sync payload:', payload);
      if (payload?.error) {
        console.groupEnd();
        throw buildSyncError('SoundCloud server sync failed', payload);
      }
      if (payload && typeof payload === 'object') {
        const created = Number((payload as any).created ?? 0);
        const updated = Number((payload as any).updated ?? 0);
        const skipped = Number((payload as any).skipped ?? 0);
        console.log('[Integrations][SoundCloud] Server sync summary:', { created, updated, skipped });
        console.groupEnd();
        return { created, updated, skipped };
      }
      console.warn('[Integrations][SoundCloud] Server sync returned an unexpected payload; falling back to client-side upsert.');
    } else {
      console.warn('[Integrations][SoundCloud] No access token available; falling back to client-side upsert (may hit RLS).');
    }
  } catch (e: any) {
    console.warn('[Integrations][SoundCloud] Server sync threw; falling back to client-side upsert (may hit RLS).', e?.message ?? e);
  }

  const releases = await fetchReleases();
  console.log('[Integrations][SoundCloud] Existing release count:', releases.length);
  const byTitle = new Map(releases.map((release) => [normalizeReleaseTitle(release.title), release]));
  const bySlug = new Map(
    releases
      .map((release) => {
        const slug = soundCloudSlug(release.distribution?.soundcloud_url || release.soundcloud_track_id);
        return slug ? [slug, release] as const : null;
      })
      .filter(Boolean) as ReadonlyArray<readonly [string, (typeof releases)[number]]>,
  );

  let updated = 0;
  let created = 0;
  let skipped = 0;

  for (const track of tracks) {
    const titleKey = normalizeReleaseTitle(track.title);
    const slug = soundCloudSlug(track.permalink_url);
    const existing = (slug ? bySlug.get(slug) : null) ?? byTitle.get(titleKey) ?? null;
    console.groupCollapsed('[Integrations][SoundCloud] Track candidate');
    console.log('[Integrations][SoundCloud] Raw track:', {
      title: track.title ?? null,
      permalink_url: track.permalink_url ?? null,
      created_at: track.created_at ?? null,
      playback_count: track.playback_count ?? null,
    });
    console.log('[Integrations][SoundCloud] Match lookup:', {
      titleKey,
      slug,
      matchedReleaseId: existing?.id ?? null,
      matchedReleaseTitle: existing?.title ?? null,
    });
    const performance = {
      streams: {
        spotify: Number(existing?.performance?.streams?.spotify ?? 0),
        apple: Number(existing?.performance?.streams?.apple ?? 0),
        soundcloud: Number(track.playback_count ?? 0),
        youtube: Number(existing?.performance?.streams?.youtube ?? 0),
      },
    };
    const soundcloud_stats = {
      plays:    Number(track.playback_count ?? 0),
      likes:    Number(track.likes_count ?? track.favoritings_count ?? 0),
      reposts:  Number(track.reposts_count ?? 0),
      comments: Number(track.comment_count ?? 0),
    };
    const distribution = {
      spotify_url: existing?.distribution?.spotify_url ?? null,
      apple_music_url: existing?.distribution?.apple_music_url ?? null,
      soundcloud_url: track.permalink_url ?? existing?.distribution?.soundcloud_url ?? null,
      youtube_url: existing?.distribution?.youtube_url ?? null,
    };

    try {
      const payload = existing
        ? {
            id: existing.id,
            title: existing.title,
            soundcloud_track_id: track.permalink_url ?? existing.soundcloud_track_id ?? null,
            distribution,
            performance,
            soundcloud_stats,
            status: existing.status ?? 'released',
            release_date: existing.release_date ?? (track.created_at ? String(track.created_at).split('T')[0] : null),
          }
        : {
            title: track.title,
            status: 'released',
            release_date: track.created_at ? String(track.created_at).split('T')[0] : new Date().toISOString().split('T')[0],
            soundcloud_track_id: track.permalink_url ?? null,
            distribution,
            performance,
            soundcloud_stats,
          };

      console.log('[Integrations][SoundCloud] saveRelease payload summary:', {
        mode: existing ? 'update' : 'insert',
        id: (payload as any).id ?? null,
        title: payload.title ?? null,
        status: payload.status ?? null,
        release_date: payload.release_date ?? null,
        soundcloud_track_id: payload.soundcloud_track_id ?? null,
      });
      await saveRelease(payload);
      if (existing) {
        updated += 1;
        console.log('[Integrations][SoundCloud] Release updated successfully:', existing.id);
      } else {
        created += 1;
        console.log('[Integrations][SoundCloud] Release created successfully for title:', track.title ?? null);
      }
    } catch (error: any) {
      skipped += 1;
      console.error('[Integrations][SoundCloud] saveRelease failed for track:', {
        title: track.title ?? null,
        permalink_url: track.permalink_url ?? null,
        message: error?.message ?? null,
        details: error?.details ?? null,
        hint: error?.hint ?? null,
        code: error?.code ?? null,
        status: error?.status ?? null,
      });
    } finally {
      console.groupEnd();
    }
  }

  console.log('[Integrations][SoundCloud] Final sync summary:', { updated, created, skipped });
  console.groupEnd();
  return { updated, created, skipped };
}

function songstatsSourceValue(stats: Array<{ source: string; data: Record<string, number> }>, source: string, key: string) {
  return Number(stats.find((entry) => entry.source === source)?.data?.[key] ?? 0);
}

async function syncSongstatsReleases(songstatsArtistId: string) {
  console.group('[Integrations][Songstats] syncSongstatsReleases');
  console.log('[Integrations][Songstats] Artist id:', songstatsArtistId);
  try {
    const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
    if (sessionErr) {
      console.warn('[Integrations][Songstats] supabase.auth.getSession error:', sessionErr.message);
    }
    const token = sessionData?.session?.access_token ?? null;
    if (token) {
      console.log('[Integrations][Songstats] Calling server sync endpoint: /api/integrations/songstats/sync-releases');
      const payload = await fetchServerJsonWithFallback<any>(
        '/api/integrations/songstats/sync-releases',
        'songstats-sync-releases',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ songstatsArtistId }),
        },
      );
      console.log('[Integrations][Songstats] Server sync payload:', payload);
      if (payload?.error) {
        throw new Error(payload.error);
      }
      if (payload && typeof payload === 'object') {
        const updated = Number(payload.updated ?? 0);
        const skipped = Number(payload.skipped ?? 0);
        console.log('[Integrations][Songstats] Server sync summary:', { updated, skipped });
        console.groupEnd();
        return { updated, skipped };
      }
    }
  } catch (error: any) {
    console.warn('[Integrations][Songstats] Server sync failed; falling back to client-side saveRelease path.', {
      message: error?.message ?? String(error),
    });
  }

  const [releases, catalogResponse] = await Promise.all([
    fetchReleases(),
    fetchArtistCatalog(songstatsArtistId, { limit: 100 }),
  ]);
  console.log('[Integrations][Songstats] Existing release count:', releases.length);

  const catalog = catalogResponse.catalog ?? [];
  console.log('[Integrations][Songstats] Catalog count:', catalog.length);
  // Title-only matching — normalize both sides so "Young - MacLit Remix" == "Young (MacLit Remix)"
  const catalogByTitle = new Map(catalog.map((track) => [normalizeReleaseTitle(track.title), track]));

  let updated = 0;
  let skipped = 0;

  for (const release of releases) {
    console.groupCollapsed('[Integrations][Songstats] Release candidate');
    console.log('[Integrations][Songstats] Release:', {
      id: release.id,
      title: release.title,
      isrc: release.isrc ?? null,
      spotify_track_id: release.spotify_track_id ?? null,
    });
    const matched = catalogByTitle.get(normalizeReleaseTitle(release.title));
    if (!matched) {
      skipped += 1;
      console.warn('[Integrations][Songstats] No catalog match for release.');
      console.groupEnd();
      continue;
    }
    console.log('[Integrations][Songstats] Matched catalog track:', {
      songstats_track_id: matched.songstats_track_id,
      title: matched.title,
      isrcs: matched.isrcs ?? [],
    });

    const [trackStats, trackInfo] = await Promise.all([
      fetchTrackStats(matched.songstats_track_id, 'all').catch((error) => {
        console.warn('[Integrations][Songstats] fetchTrackStats failed:', {
          songstats_track_id: matched.songstats_track_id,
          message: error?.message ?? null,
        });
        return null;
      }),
      fetchTrackInfo(matched.songstats_track_id).catch((error) => {
        console.warn('[Integrations][Songstats] fetchTrackInfo failed:', {
          songstats_track_id: matched.songstats_track_id,
          message: error?.message ?? null,
        });
        return null;
      }),
    ]);
    if (!trackStats && !trackInfo) {
      skipped += 1;
      console.warn('[Integrations][Songstats] Both stats and info failed for matched track. Skipping.');
      console.groupEnd();
      continue;
    }

    const links = trackInfo?.track_info?.links ?? [];
    console.log('[Integrations][Songstats] Resolved links:', links);
    const distribution = {
      spotify_url: links.find((link) => link.source === 'spotify')?.url ?? release.distribution?.spotify_url ?? null,
      apple_music_url: links.find((link) => link.source === 'apple_music')?.url ?? release.distribution?.apple_music_url ?? null,
      soundcloud_url: release.distribution?.soundcloud_url ?? null,
      youtube_url: release.distribution?.youtube_url ?? null,
    };

    const performance = {
      streams: {
        spotify: songstatsSourceValue(trackStats?.stats ?? [], 'spotify', 'streams_total') || Number(release.performance?.streams?.spotify ?? 0),
        apple: songstatsSourceValue(trackStats?.stats ?? [], 'apple_music', 'streams_total') || Number(release.performance?.streams?.apple ?? 0),
        soundcloud: Number(release.performance?.streams?.soundcloud ?? 0),
        youtube: Number(release.performance?.streams?.youtube ?? 0),
      },
    };
    console.log('[Integrations][Songstats] saveRelease payload summary:', {
      id: release.id,
      title: release.title,
      spotify_url: distribution.spotify_url,
      apple_music_url: distribution.apple_music_url,
      soundcloud_url: distribution.soundcloud_url,
      youtube_url: distribution.youtube_url,
      streams: performance.streams,
    });

    await saveRelease({
      id: release.id,
      title: release.title,
      distribution,
      performance,
      songstats_track_id: matched.songstats_track_id,
      spotify_track_id:
        release.spotify_track_id ??
        links.find((link) => link.source === 'spotify')?.external_id ??
        null,
    });
    updated += 1;
    console.log('[Integrations][Songstats] Release updated successfully:', release.id);
    console.groupEnd();
  }

  console.log('[Integrations][Songstats] Final sync summary:', { updated, skipped });
  console.groupEnd();
  return { updated, skipped };
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
