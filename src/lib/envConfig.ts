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
  supabasePublicKey:  import.meta.env.VITE_SUPABASE_PK   as string | undefined,

  // AI
  geminiApiKey:       import.meta.env.VITE_GEMINI_API_KEY as string | undefined,

  // Social publishing
  zernioApiKey:       import.meta.env.VITE_ZERNIO_API_KEY as string | undefined,

  // OAuth (client-side — Spotify PKCE or redirect)
  spotifyClientId:    import.meta.env.VITE_SPOTIFY_CLIENT_ID     as string | undefined,
  soundcloudClientId: import.meta.env.VITE_SOUNDCLOUD_CLIENT_ID  as string | undefined,

  // Analytics APIs
  spotifyAccessToken:    import.meta.env.VITE_SPOTIFY_ACCESS_TOKEN   as string | undefined,
  songstatsApiKey:       import.meta.env.VITE_SONGSTATS_API_KEY       as string | undefined,
  soundchartsAppId:      import.meta.env.VITE_SOUNDCHARTS_APP_ID      as string | undefined,
  soundchartsAppSecret:  import.meta.env.VITE_SOUNDCHARTS_APP_SECRET  as string | undefined,
} as const;

// ── Feature flags (safe booleans, never crash) ────────────────────────────────

export const features = {
  supabase:          !!env.supabaseUrl && !!env.supabasePublicKey,
  gemini:            !!env.geminiApiKey,
  zernioPublishing:  !!env.zernioApiKey,
  spotifyAuth:       !!env.spotifyClientId,
  soundcloudAuth:    !!env.soundcloudClientId,
  spotifyAnalytics:  !!env.spotifyAccessToken,
  songstatsAnalytics: !!env.songstatsApiKey,
  soundchartsAnalytics: !!env.soundchartsAppId && !!env.soundchartsAppSecret,
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
  { key: 'VITE_SUPABASE_PK',             label: 'Supabase anon key',      required: true,  configured: !!env.supabasePublicKey },
  { key: 'VITE_GEMINI_API_KEY',          label: 'Gemini AI key',          required: false, configured: !!env.geminiApiKey },
  { key: 'VITE_ZERNIO_API_KEY',          label: 'Zernio publishing key',  required: false, configured: !!env.zernioApiKey },
  { key: 'VITE_SPOTIFY_CLIENT_ID',       label: 'Spotify OAuth client',   required: false, configured: !!env.spotifyClientId },
  { key: 'VITE_SOUNDCLOUD_CLIENT_ID',    label: 'SoundCloud OAuth client',required: false, configured: !!env.soundcloudClientId },
  { key: 'VITE_SPOTIFY_ACCESS_TOKEN',    label: 'Spotify analytics token',required: false, configured: !!env.spotifyAccessToken },
  { key: 'VITE_SONGSTATS_API_KEY',       label: 'Songstats API key',      required: false, configured: !!env.songstatsApiKey },
  { key: 'VITE_SOUNDCHARTS_APP_ID',      label: 'Soundcharts App ID',     required: false, configured: !!env.soundchartsAppId },
  { key: 'VITE_SOUNDCHARTS_APP_SECRET',  label: 'Soundcharts App Secret', required: false, configured: !!env.soundchartsAppSecret },
];

/** Log missing env vars to the console in development only. */
export function reportEnvReadiness(): void {
  if (import.meta.env.PROD) return;

  const missing = CHECKS.filter(c => !c.configured);
  if (missing.length === 0) return;

  const requiredMissing = missing.filter(c => c.required);
  const optionalMissing = missing.filter(c => !c.required);

  if (requiredMissing.length) {
    console.error(
      '[Artist OS] Missing REQUIRED environment variables:\n' +
      requiredMissing.map(c => `  • ${c.key}  (${c.label})`).join('\n') +
      '\n\nThe app will not function without these. Copy .env.example to .env and fill in values.',
    );
  }
  if (optionalMissing.length) {
    console.info(
      '[Artist OS] Optional integrations not configured (features will be disabled):\n' +
      optionalMissing.map(c => `  • ${c.key}  (${c.label})`).join('\n'),
    );
  }
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
