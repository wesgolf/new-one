/**
 * Central environment configuration and validation.
 *
 * Provides typed accessors for all env vars, safe fallbacks (never throws),
 * and a readiness report used in dev mode to surface missing configuration.
 */

// ── Typed accessors ───────────────────────────────────────────────────────────

export const env = {
  // Supabase (required)
  supabaseUrl:        import.meta.env.VITE_SUPABASE_URL  as string | undefined,
  supabasePublicKey: (
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    import.meta.env.VITE_SUPABASE_ANON ||
    import.meta.env.VITE_SUPABASE_PK
  ) as string | undefined,

  // AI
  geminiApiKey:       import.meta.env.VITE_GEMINI_API_KEY as string | undefined,

  // Social publishing
  zernioApiKey:       import.meta.env.VITE_ZERNIO_API_KEY as string | undefined,

  // OAuth (client-side — Spotify PKCE or redirect)
  spotifyClientId:    import.meta.env.VITE_SPOTIFY_CLIENT_ID     as string | undefined,
  soundcloudClientId: import.meta.env.VITE_SOUNDCLOUD_CLIENT_ID  as string | undefined,

  // Analytics APIs
  spotifyAccessToken:    import.meta.env.VITE_SPOTIFY_ACCESS_TOKEN   as string | undefined,
  songstatsArtistId:     import.meta.env.VITE_SONGSTATS_ARTIST_ID     as string | undefined,
  soundchartsAppId:      import.meta.env.VITE_SOUNDCHARTS_APP_ID      as string | undefined,
  soundchartsAppSecret:  import.meta.env.VITE_SOUNDCHARTS_APP_SECRET  as string | undefined,

  // Dropbox file storage
  dropboxAppKey:         import.meta.env.VITE_DROPBOX_API_KEY         as string | undefined,
  dropboxRefreshToken:   import.meta.env.VITE_DROPBOX_REFRESH_TOKEN   as string | undefined,
  dropboxAccessToken:    import.meta.env.VITE_DROPBOX_ACCESS_TOKEN    as string | undefined,
} as const;

// ── Feature flags (safe booleans, never crash) ────────────────────────────────

export const features = {
  supabase:          !!env.supabaseUrl && !!env.supabasePublicKey,
  gemini:            !!env.geminiApiKey,
  zernioPublishing:  !!env.zernioApiKey,
  spotifyAuth:       !!env.spotifyClientId,
  soundcloudAuth:    !!env.soundcloudClientId,
  spotifyAnalytics:  !!env.spotifyAccessToken,
  songstatsAnalytics: !!env.songstatsArtistId,
  soundchartsAnalytics: !!env.soundchartsAppId && !!env.soundchartsAppSecret,
  dropboxUpload:         !!env.dropboxAccessToken || !!env.dropboxRefreshToken || !!env.dropboxAppKey,
} as const;

// Convenience: at least one analytics provider configured
export const hasAnyAnalyticsProvider =
  features.spotifyAnalytics || features.songstatsAnalytics || features.soundchartsAnalytics;

// ── Dev-mode readiness report ─────────────────────────────────────────────────

interface EnvCheck {
  key: string;
  label: string;
  required: boolean;
  configured: boolean;
}

const CHECKS: EnvCheck[] = [
  { key: 'VITE_SUPABASE_URL',            label: 'Supabase URL',           required: true,  configured: !!env.supabaseUrl },
  { key: 'VITE_SUPABASE_ANON_KEY',       label: 'Supabase anon key',      required: true,  configured: !!env.supabasePublicKey },
  { key: 'VITE_GEMINI_API_KEY',          label: 'Gemini AI key',          required: false, configured: !!env.geminiApiKey },
  { key: 'VITE_ZERNIO_API_KEY',          label: 'Zernio publishing key',  required: false, configured: !!env.zernioApiKey },
  { key: 'VITE_SPOTIFY_CLIENT_ID',       label: 'Spotify OAuth client',   required: false, configured: !!env.spotifyClientId },
  { key: 'VITE_SOUNDCLOUD_CLIENT_ID',    label: 'SoundCloud OAuth client',required: false, configured: !!env.soundcloudClientId },
  { key: 'VITE_SPOTIFY_ACCESS_TOKEN',    label: 'Spotify analytics token',required: false, configured: !!env.spotifyAccessToken },

  { key: 'VITE_SOUNDCHARTS_APP_ID',      label: 'Soundcharts App ID',     required: false, configured: !!env.soundchartsAppId },
  { key: 'VITE_SOUNDCHARTS_APP_SECRET',  label: 'Soundcharts App Secret', required: false, configured: !!env.soundchartsAppSecret },
  { key: 'VITE_DROPBOX_API_KEY',          label: 'Dropbox app key',        required: false, configured: !!env.dropboxAppKey },
  { key: 'VITE_DROPBOX_REFRESH_TOKEN',    label: 'Dropbox refresh token',  required: false, configured: !!env.dropboxRefreshToken },
  { key: 'VITE_DROPBOX_ACCESS_TOKEN',     label: 'Dropbox access token',   required: false, configured: !!env.dropboxAccessToken },
];

let networkStatusListenersBound = false;

function getNetworkStatusLabel(): 'online' | 'offline' | 'unknown' {
  if (typeof navigator === 'undefined') return 'unknown';
  return navigator.onLine ? 'online' : 'offline';
}

function getApiStatusSummary(): string {
  const analyticsConfigured = [
    features.spotifyAnalytics,
    features.songstatsAnalytics,
    features.soundchartsAnalytics,
  ].filter(Boolean).length;

  return [
    `supabase:${features.supabase ? 'ready' : 'missing'}`,
    `ai:${features.gemini ? 'ready' : 'off'}`,
    `publishing:${features.zernioPublishing ? 'ready' : 'off'}`,
    `oauth:${[features.spotifyAuth, features.soundcloudAuth].filter(Boolean).length}/2`,
    `analytics:${analyticsConfigured}/3`,
    `storage:${features.dropboxUpload ? 'ready' : 'off'}`,
  ].join(' | ');
}

function bindNetworkStatusListeners(): void {
  if (networkStatusListenersBound || typeof window === 'undefined') return;

  const logNetworkStatus = () => {
    console.info(`[Artist OS] Network ${getNetworkStatusLabel()}`);
  };

  window.addEventListener('online', logNetworkStatus);
  window.addEventListener('offline', logNetworkStatus);
  networkStatusListenersBound = true;
}

/** Log a compact runtime status summary in development only. */
export function reportEnvReadiness(): void {
  if (import.meta.env.PROD) return;

  bindNetworkStatusListeners();

  const missingRequired = CHECKS
    .filter(c => c.required && !c.configured)
    .map(c => c.key);

  const logger = missingRequired.length > 0 ? console.error : console.info;
  const requiredSummary =
    missingRequired.length > 0
      ? ` | missing required env: ${missingRequired.join(', ')}`
      : '';

  logger(
    `[Artist OS] Status | network:${getNetworkStatusLabel()} | ${getApiStatusSummary()}${requiredSummary}`,
  );
}

/** Returns a summary of which integrations are ready vs. missing. */
export function getEnvSummary() {
  return CHECKS.map(c => ({
    key: c.key,
    label: c.label,
    required: c.required,
    configured: c.configured,
  }));
}
