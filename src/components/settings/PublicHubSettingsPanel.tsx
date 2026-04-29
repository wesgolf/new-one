import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Radio, RefreshCw, Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { fetchPublicHubReleases } from '../../lib/supabaseData';
import type { ReleaseRecord } from '../../types/domain';
import { DEFAULT_PUBLIC_HUB_SETTINGS, type HubSettings } from '../../hooks/usePublicHubSettings';
import { SettingsCard, SettingsFieldRow, SettingsLoadingSkeleton, SettingsSectionHeader } from './SettingsPrimitives';

const PUBLIC_HUB_SETTINGS_TIMEOUT_MS = 4000;
const PUBLIC_HUB_SETTINGS_CACHE_KEY = 'artist_os_settings:public_hub';

async function withTimeout<T>(promise: PromiseLike<T> | T, ms = PUBLIC_HUB_SETTINGS_TIMEOUT_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(promise),
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Public Hub settings request timed out')), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function readCachedPublicHubSettings(): HubSettings {
  try {
    const raw = localStorage.getItem(PUBLIC_HUB_SETTINGS_CACHE_KEY);
    if (!raw) return DEFAULT_PUBLIC_HUB_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<HubSettings>;
    return normalizePublicHubSettings(parsed);
  } catch {
    return DEFAULT_PUBLIC_HUB_SETTINGS;
  }
}

function writeCachedPublicHubSettings(settings: HubSettings) {
  try {
    localStorage.setItem(PUBLIC_HUB_SETTINGS_CACHE_KEY, JSON.stringify(settings));
  } catch {
    // ignore cache failures
  }
}

function normalizePublicHubSettings(input?: Partial<HubSettings> | null): HubSettings {
  return {
    ...DEFAULT_PUBLIC_HUB_SETTINGS,
    ...(input ?? {}),
    spotifyUrl: input?.spotifyUrl?.trim() || DEFAULT_PUBLIC_HUB_SETTINGS.spotifyUrl,
    appleMusicUrl: input?.appleMusicUrl?.trim() || DEFAULT_PUBLIC_HUB_SETTINGS.appleMusicUrl,
    soundcloudUrl: input?.soundcloudUrl?.trim() || DEFAULT_PUBLIC_HUB_SETTINGS.soundcloudUrl,
    instagramUrl: input?.instagramUrl?.trim() || DEFAULT_PUBLIC_HUB_SETTINGS.instagramUrl,
    tiktokUrl: input?.tiktokUrl?.trim() || DEFAULT_PUBLIC_HUB_SETTINGS.tiktokUrl,
    youtubeUrl: input?.youtubeUrl?.trim() || DEFAULT_PUBLIC_HUB_SETTINGS.youtubeUrl,
    contactEmail: input?.contactEmail?.trim() || DEFAULT_PUBLIC_HUB_SETTINGS.contactEmail,
    pressKitUrl: input?.pressKitUrl?.trim() || DEFAULT_PUBLIC_HUB_SETTINGS.pressKitUrl,
  };
}

export function PublicHubSettingsPanel() {
  const [settings, setSettings] = useState<HubSettings>(readCachedPublicHubSettings());
  const [releases, setReleases] = useState<ReleaseRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const [releaseRows, rowResult] = await Promise.allSettled([
      withTimeout(fetchPublicHubReleases()),
      withTimeout(
        supabase.from('app_settings').select('value').eq('key', 'public_hub').maybeSingle(),
      ),
    ]);

    if (releaseRows.status === 'fulfilled') {
      setReleases(releaseRows.value);
    } else {
      setReleases([]);
    }

    if (rowResult.status === 'fulfilled') {
      if (rowResult.value.error) {
        setSettings(DEFAULT_PUBLIC_HUB_SETTINGS);
      } else if (rowResult.value.data?.value && typeof rowResult.value.data.value === 'object') {
        const merged = normalizePublicHubSettings(rowResult.value.data.value as Partial<HubSettings>);
        setSettings(merged);
        writeCachedPublicHubSettings(merged);
      } else {
        setSettings(DEFAULT_PUBLIC_HUB_SETTINGS);
      }
    } else {
      setSettings(DEFAULT_PUBLIC_HUB_SETTINGS);
      setError(null);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = useCallback(async () => {
    setSaving(true);
    setSaved(false);
    setError(null);
    const normalized = normalizePublicHubSettings(settings);
    writeCachedPublicHubSettings(normalized);
    try {
      const { error: upsertError } = await withTimeout(
        supabase
          .from('app_settings')
          .upsert(
            { key: 'public_hub', value: normalized },
            { onConflict: 'key' },
          ),
      );

      if (upsertError) throw upsertError;

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to save public hub settings');
    } finally {
      setSaving(false);
    }
  }, [settings]);

  const releasedReleases = useMemo(() => {
    const rows = releases.filter((release) => String(release.status ?? '').toLowerCase() === 'released');
    return rows.length > 0 ? rows : releases;
  }, [releases]);

  const previewRelease = useMemo(() => {
    if (!settings.featuredReleaseId) return releasedReleases[0] ?? null;
    return releasedReleases.find((release) => release.id === settings.featuredReleaseId) ?? releasedReleases[0] ?? null;
  }, [releasedReleases, settings.featuredReleaseId]);

  const previewRadioMix = useMemo(() => {
    if (!settings.radioMixReleaseId) return releasedReleases.find((release) => {
      const type = String(release.type ?? '').toLowerCase();
      const title = String(release.title ?? '').toLowerCase();
      return type.includes('mix') || type.includes('episode') || title.includes('radio') || title.includes('mix');
    }) ?? null;
    return releasedReleases.find((release) => release.id === settings.radioMixReleaseId) ?? null;
  }, [releasedReleases, settings.radioMixReleaseId]);

  if (loading) return <SettingsLoadingSkeleton />;

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <p className="text-sm text-error">{error}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="flex items-center gap-2 text-xs font-semibold text-brand transition-colors hover:text-brand-hover"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <SettingsSectionHeader
        Icon={Radio}
        title="Public Hub"
        description="Control what visitors see on the public-facing artist page."
      />

      <SettingsCard title="Preview">
        <div className="px-5 py-5">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-dashed border-border bg-surface-raised p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Hero links</p>
              <p className="mt-2 text-base font-bold text-text-primary">Instagram, Spotify, Apple, SoundCloud, TikTok, YouTube</p>
              <p className="mt-1 text-sm text-text-secondary">Pulled from env defaults unless you override them here.</p>
            </div>
            <div className="rounded-2xl border border-dashed border-border bg-surface-raised p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Featured release</p>
              <p className="mt-2 text-base font-bold text-text-primary">{previewRelease?.title ?? 'Latest released track'}</p>
              <p className="mt-1 text-sm text-text-secondary">
                {previewRelease?.release_date
                  ? new Date(previewRelease.release_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                  : 'Falls back to the newest released track'}
              </p>
            </div>
            <div className="rounded-2xl border border-dashed border-border bg-surface-raised p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Radio mix</p>
              <p className="mt-2 text-base font-bold text-text-primary">{previewRadioMix?.title ?? 'Latest radio mix'}</p>
              <p className="mt-1 text-sm text-text-secondary">Choose a specific mix below or keep the latest one automatic.</p>
            </div>
          </div>
        </div>
      </SettingsCard>

      <SettingsCard title="Social links">
        <SettingsFieldRow label="Spotify URL" description="Public Spotify artist profile URL for the hero section.">
          <input
            type="url"
            value={settings.spotifyUrl}
            onChange={(e) => setSettings((prev) => ({ ...prev, spotifyUrl: e.target.value }))}
            className="min-w-[260px] rounded-xl border border-border bg-white px-3.5 py-2 text-sm text-text-primary outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/10"
            placeholder="https://open.spotify.com/artist/..."
          />
        </SettingsFieldRow>

        <SettingsFieldRow label="Apple Music URL" description="Public Apple Music artist profile URL for the hero section.">
          <input
            type="url"
            value={settings.appleMusicUrl}
            onChange={(e) => setSettings((prev) => ({ ...prev, appleMusicUrl: e.target.value }))}
            className="min-w-[260px] rounded-xl border border-border bg-white px-3.5 py-2 text-sm text-text-primary outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/10"
            placeholder="https://music.apple.com/..."
          />
        </SettingsFieldRow>

        <SettingsFieldRow label="SoundCloud URL" description="Public SoundCloud artist profile URL for the hero section.">
          <input
            type="url"
            value={settings.soundcloudUrl}
            onChange={(e) => setSettings((prev) => ({ ...prev, soundcloudUrl: e.target.value }))}
            className="min-w-[260px] rounded-xl border border-border bg-white px-3.5 py-2 text-sm text-text-primary outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/10"
            placeholder="https://soundcloud.com/..."
          />
        </SettingsFieldRow>

        <SettingsFieldRow label="Instagram URL" description="Instagram profile URL shown in the hero section.">
          <input
            type="url"
            value={settings.instagramUrl}
            onChange={(e) => setSettings((prev) => ({ ...prev, instagramUrl: e.target.value }))}
            className="min-w-[260px] rounded-xl border border-border bg-white px-3.5 py-2 text-sm text-text-primary outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/10"
            placeholder="https://instagram.com/..."
          />
        </SettingsFieldRow>

        <SettingsFieldRow label="TikTok URL" description="Public TikTok profile URL shown in the hero section.">
          <input
            type="url"
            value={settings.tiktokUrl}
            onChange={(e) => setSettings((prev) => ({ ...prev, tiktokUrl: e.target.value }))}
            className="min-w-[260px] rounded-xl border border-border bg-white px-3.5 py-2 text-sm text-text-primary outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/10"
            placeholder="https://www.tiktok.com/@..."
          />
        </SettingsFieldRow>

        <SettingsFieldRow label="YouTube URL" description="Public YouTube channel URL shown in the hero section.">
          <input
            type="url"
            value={settings.youtubeUrl}
            onChange={(e) => setSettings((prev) => ({ ...prev, youtubeUrl: e.target.value }))}
            className="min-w-[260px] rounded-xl border border-border bg-white px-3.5 py-2 text-sm text-text-primary outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/10"
            placeholder="https://www.youtube.com/..."
          />
        </SettingsFieldRow>
      </SettingsCard>

      <SettingsCard title="Featured Track">
        <SettingsFieldRow
          label="Featured release"
          description="Leave this on default to use your newest released track. Select a specific release to pin it on the public hub."
        >
          <select
            value={settings.featuredReleaseId ?? ''}
            onChange={(e) => setSettings((prev) => ({ ...prev, featuredReleaseId: e.target.value || null }))}
            className="min-w-[260px] rounded-xl border border-border bg-white px-3.5 py-2 text-sm text-text-primary outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/10"
          >
            <option value="">Latest released track (default)</option>
            {releasedReleases.map((release) => (
              <option key={release.id} value={release.id}>
                {release.title}
              </option>
            ))}
          </select>
        </SettingsFieldRow>

        <SettingsFieldRow
          label="Radio mix"
          description="Pick the release that should appear in the Radio Mix section."
        >
          <select
            value={settings.radioMixReleaseId ?? ''}
            onChange={(e) => setSettings((prev) => ({ ...prev, radioMixReleaseId: e.target.value || null }))}
            className="min-w-[260px] rounded-xl border border-border bg-white px-3.5 py-2 text-sm text-text-primary outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/10"
          >
            <option value="">Latest radio mix (default)</option>
            {releasedReleases.map((release) => (
              <option key={release.id} value={release.id}>
                {release.title}
              </option>
            ))}
          </select>
        </SettingsFieldRow>
      </SettingsCard>

      <SettingsCard title="Footer Links">
        <SettingsFieldRow label="Press kit URL" description="Used by the footer Press Kit link.">
          <input
            type="url"
            value={settings.pressKitUrl}
            onChange={(e) => setSettings((prev) => ({ ...prev, pressKitUrl: e.target.value }))}
            className="min-w-[260px] rounded-xl border border-border bg-white px-3.5 py-2 text-sm text-text-primary outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/10"
            placeholder="https://..."
          />
        </SettingsFieldRow>
      </SettingsCard>

      <div className="flex items-center justify-end gap-3 pt-1">
        {saved && <span className="text-xs font-semibold text-success">Saved</span>}
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving
            ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Saving…</>
            : <><Save className="h-3.5 w-3.5" /> Save changes</>
          }
        </button>
      </div>
    </div>
  );
}
