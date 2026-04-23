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
  featuredTracks: Array<{ title: string; url: string; streams: string }>;
}

const DEFAULTS: HubSettings = {
  heroTitle:     ARTIST_INFO.name,
  heroSubtitle:  'Artist & Producer',
  heroImage:     '',
  ctaText:       'Stream Now',
  ctaUrl:        '',
  spotifyUrl:    '',
  appleMusicUrl: '',
  soundcloudUrl: ARTIST_INFO.soundcloud_url ?? '',
  instagramUrl:  `https://instagram.com/${(ARTIST_INFO.instagram_handle ?? '').replace('@', '')}`,
  tiktokUrl:     '',
  youtubeUrl:    '',
  contactEmail:  ARTIST_INFO.email ?? '',
  pressKitUrl:   '',
  featuredTracks: [],
};

export function usePublicHubSettings(): { settings: HubSettings; loading: boolean } {
  const [settings, setSettings] = useState<HubSettings>(DEFAULTS);
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
          setSettings({ ...DEFAULTS, ...(data.value as Partial<HubSettings>) });
        }
      } catch {
        // fall through to setLoading
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return { settings, loading };
}
