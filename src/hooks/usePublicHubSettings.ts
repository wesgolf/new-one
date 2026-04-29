/**
 * usePublicHubSettings — loads the `public_hub` settings row from Supabase
 * and exposes merged values (Supabase overrides env defaults).
 *
 * Falls back gracefully to constants / env when Supabase is unavailable or
 * the row hasn't been populated yet.
 */

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ARTIST_INFO } from '../constants';

export interface HubSettings {
  heroTitle:     string;
  heroSubtitle:  string;
  heroImage:     string;
  ctaText:       string;
  ctaUrl:        string;
  spotifyUrl:    string;
  appleMusicUrl: string;
  soundcloudUrl: string;
  instagramUrl:  string;
  tiktokUrl:     string;
  youtubeUrl:    string;
  contactEmail:  string;
  pressKitUrl:   string;
  featuredReleaseId?: string | null;
  radioMixReleaseId?: string | null;
  featuredTracks: Array<{ title: string; url: string; streams: string }>;
}

export const DEFAULT_PUBLIC_HUB_SETTINGS: HubSettings = {
  heroTitle:     ARTIST_INFO.name,
  heroSubtitle:  'Artist & Producer',
  heroImage:     '',
  ctaText:       'Stream Now',
  ctaUrl:        '',
  spotifyUrl:    ARTIST_INFO.spotify_url ?? '',
  appleMusicUrl: ARTIST_INFO.apple_music_url ?? '',
  soundcloudUrl: ARTIST_INFO.soundcloud_url ?? '',
  instagramUrl:  ARTIST_INFO.instagram_url || `https://instagram.com/${(ARTIST_INFO.instagram_handle ?? '').replace('@', '')}`,
  tiktokUrl:     ARTIST_INFO.tiktok_url ?? '',
  youtubeUrl:    ARTIST_INFO.youtube_url ?? '',
  contactEmail:  ARTIST_INFO.email ?? '',
  pressKitUrl:   ARTIST_INFO.press_kit_url ?? '',
  featuredReleaseId: null,
  radioMixReleaseId: null,
  featuredTracks: [],
};

function normalizeHubSettings(input?: Partial<HubSettings> | null): HubSettings {
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

export function usePublicHubSettings(): { settings: HubSettings; loading: boolean } {
  const [settings, setSettings] = useState<HubSettings>(DEFAULT_PUBLIC_HUB_SETTINGS);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const { data } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'public_hub')
          .maybeSingle();
        if (cancelled) return;
        if (data?.value && typeof data.value === 'object') {
          setSettings(normalizeHubSettings(data.value as Partial<HubSettings>));
        }
      } catch {
        // fall through to setLoading
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return { settings: normalizeHubSettings(settings), loading };
}
