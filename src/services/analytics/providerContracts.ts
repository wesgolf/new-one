/**
 * providerContracts.ts
 *
 * Domain-specific provider contracts for Artist OS intelligence layer.
 *
 * These interfaces define the data shapes that future provider implementations
 * (Soundcharts, Songstats, Auphonic, etc.) must satisfy. They are intentionally
 * provider-agnostic — the same interface works regardless of which API backs it.
 *
 * Architecture notes:
 * - Each contract is a TypeScript interface, NOT an abstract class.
 * - Contracts are separate from the `AnalyticsProvider` dashboard contract in
 *   baseProvider.ts. A single provider SDK can satisfy multiple contracts.
 * - All methods are async. Return types use `| null` to signal "not configured"
 *   without throwing, which keeps the UI resilient to missing credentials.
 * - `ProviderMeta` is included on every result to preserve provenance and enable
 *   the UI to show source attribution and sync freshness.
 *
 * Source-of-truth ownership (see FUTURE_INTEGRATIONS.md for full rationale):
 *   Playlisting               → Soundcharts  (playlist events, editorial data)
 *   Competitor benchmarking   → Soundcharts  (market position, audience overlap)
 *   Cross-platform analytics  → Songstats    (track-level streaming across DSPs)
 *   Audio processing/mastering→ Auphonic     (post-production workflow automation)
 *   Scheduling / publishing   → Zernio       (existing footprint, hourly cadence)
 *
 * Do NOT implement API calls in this file — it is a contract definition only.
 */

// ─── Shared primitives ────────────────────────────────────────────────────────

/** Provenance metadata attached to every provider response. */
export interface ProviderMeta {
  /** Provider identifier matching IntegrationProvider union in domain.ts */
  provider: string;
  /** ISO timestamp of when this data was fetched or last synced */
  fetchedAt: string;
  /** True if this data came from a live API call; false if from a cached snapshot */
  live: boolean;
}

/** A single numeric metric with optional change delta for trending */
export interface ProviderMetric {
  key: string;
  label: string;
  value: number;
  unit?: string;
  /** Absolute change since previous period */
  delta?: number | null;
  /** Percentage change since previous period */
  deltaPercent?: number | null;
  /** ISO date range this metric covers */
  period?: { start: string; end: string };
}

// ─── 1. Artist Analytics ──────────────────────────────────────────────────────

/**
 * Cross-platform artist-level performance summary.
 * Best suited for: Songstats (streaming), Soundcharts (market rank + audience).
 */
export interface ArtistAnalyticsSnapshot {
  artistId: string;
  artistName: string;
  metrics: ProviderMetric[];
  /** Monthly listeners, follower counts, etc. keyed by platform slug */
  platformBreakdown: Record<string, ProviderMetric[]>;
  meta: ProviderMeta;
}

export interface ArtistAnalyticsContract {
  /**
   * Fetch current-state artist metrics.
   * Returns null when provider is not configured or artist ID is unknown.
   */
  getArtistSnapshot(artistId: string): Promise<ArtistAnalyticsSnapshot | null>;

  /**
   * Fetch historical artist metrics for a date range.
   * Consumers should cache results in `report_snapshots`.
   */
  getArtistHistory(
    artistId: string,
    from: string,
    to: string,
  ): Promise<ArtistAnalyticsSnapshot[]>;
}

// ─── 2. Release Analytics ─────────────────────────────────────────────────────

/**
 * Per-release streaming, save, and engagement metrics.
 * Best suited for: Songstats (track-level DSP coverage), Spotify API (owned releases).
 */
export interface ReleaseAnalyticsSnapshot {
  releaseId: string;
  isrc?: string | null;
  title: string;
  /** Total streams across all platforms */
  totalStreams: number;
  /** Saves / library adds */
  totalSaves: number;
  /** Per-platform breakdown */
  platformBreakdown: Record<string, { streams: number; saves: number; revenue?: number }>;
  /** Daily/weekly trend data points for charting */
  trend: Array<{ date: string; streams: number }>;
  meta: ProviderMeta;
}

export interface ReleaseAnalyticsContract {
  getReleaseSnapshot(isrc: string): Promise<ReleaseAnalyticsSnapshot | null>;
  getReleaseHistory(isrc: string, from: string, to: string): Promise<ReleaseAnalyticsSnapshot[]>;
}

// ─── 3. Playlist Analytics ────────────────────────────────────────────────────

/**
 * Playlist adds, removals, and editorial context per release.
 * Best suited for: Soundcharts (editorial intelligence), Songstats (volume tracking).
 *
 * Events should be persisted to `playlist_events` table for historical analysis.
 */
export type PlaylistEventType = 'added' | 'removed' | 'editorial_pick' | 'algorithmic';

export interface PlaylistEvent {
  playlistId: string;
  playlistName: string;
  playlistFollowers?: number | null;
  curator?: string | null;
  platform: string;
  eventType: PlaylistEventType;
  /** ISO timestamp of when the event occurred at the source */
  occurredAt: string;
  territory?: string | null;
  isEditorial: boolean;
  estimatedStreamsPerDay?: number | null;
}

export interface PlaylistAnalyticsSnapshot {
  releaseId: string;
  isrc?: string | null;
  totalPlaylistCount: number;
  editorialCount: number;
  algorithmicCount: number;
  events: PlaylistEvent[];
  meta: ProviderMeta;
}

export interface PlaylistAnalyticsContract {
  getPlaylistSnapshot(isrc: string): Promise<PlaylistAnalyticsSnapshot | null>;
  getPlaylistHistory(
    isrc: string,
    from: string,
    to: string,
  ): Promise<PlaylistEvent[]>;
}

// ─── 4. Audience Analytics ────────────────────────────────────────────────────

/**
 * Audience growth, geography, and demographic breakdowns.
 * Best suited for: Soundcharts (global territory context), Songstats (DSP-specific audience).
 */
export interface AudienceGeo {
  country: string;
  countryCode: string;
  listeners: number;
  percent: number;
}

export interface AudienceDemographic {
  ageRange: string;
  percent: number;
  gender?: 'male' | 'female' | 'other';
}

export interface AudienceSnapshot {
  artistId: string;
  totalFollowers: number;
  monthlyListeners: number;
  followerGrowth: number;
  followerGrowthPercent: number;
  topCountries: AudienceGeo[];
  demographics: AudienceDemographic[];
  /** Source platforms included in this snapshot */
  platforms: string[];
  meta: ProviderMeta;
}

export interface AudienceAnalyticsContract {
  getAudienceSnapshot(artistId: string): Promise<AudienceSnapshot | null>;
}

// ─── 5. Competitor Analytics ──────────────────────────────────────────────────

/**
 * Tracked competitor artist roster and comparative snapshot data.
 * Best suited for: Soundcharts (market position, audience size comparisons).
 *
 * Snapshots should be persisted to `competitor_snapshots` for weekly trend views.
 */
export interface CompetitorMetrics {
  monthlyListeners: number;
  followers: Record<string, number>;
  playlistCount: number;
  recentReleases: number;
  momentum: 'rising' | 'stable' | 'declining' | 'unknown';
}

export interface CompetitorSnapshot {
  competitorArtistId: string;
  competitorName: string;
  snapshotDate: string;
  metrics: CompetitorMetrics;
  /** Audience overlap score 0–1 relative to the primary artist, if available */
  audienceOverlap?: number | null;
  meta: ProviderMeta;
}

export interface CompetitorAnalyticsContract {
  /**
   * Fetch a snapshot for one tracked competitor.
   * Consumers should persist results to `competitor_snapshots`.
   */
  getCompetitorSnapshot(
    providerArtistId: string,
  ): Promise<CompetitorSnapshot | null>;

  /**
   * Fetch snapshots for all tracked competitors in batch.
   * Allows a single API call if the provider supports bulk.
   */
  getCompetitorBatch(
    providerArtistIds: string[],
  ): Promise<CompetitorSnapshot[]>;

  /**
   * Search for a competitor by name to get their provider artist ID.
   * Used during onboarding of a new tracked artist.
   */
  searchArtist(name: string): Promise<Array<{ id: string; name: string; imageUrl?: string }>>;
}

// ─── 6. Audio Workflow Processing ─────────────────────────────────────────────

/**
 * Audio job submission, polling, and output retrieval.
 * Best suited for: Auphonic (mastering, noise reduction, chapter markers, transcription).
 *
 * Jobs should be persisted to `audio_jobs` table.
 */
export type AudioJobStatus =
  | 'pending'
  | 'processing'
  | 'done'
  | 'error'
  | 'cancelled';

export interface AudioJobSettings {
  /** Auphonic preset UUID or a named preset string */
  preset?: string;
  loudnessTarget?: number;
  outputFormats?: string[];
  addChapterMarks?: boolean;
  transcribe?: boolean;
  noiseReduction?: boolean;
  /** Arbitrary provider-specific settings overflow */
  providerOptions?: Record<string, unknown>;
}

export interface AudioJob {
  jobId: string;
  provider: string;
  status: AudioJobStatus;
  inputAssetUrl: string;
  outputAssetUrls: string[];
  settings: AudioJobSettings;
  errorMessage?: string | null;
  /** ISO timestamp when the provider accepted the job */
  startedAt?: string | null;
  /** ISO timestamp when the provider completed the job */
  completedAt?: string | null;
  meta: ProviderMeta;
}

export interface AudioWorkflowContract {
  /**
   * Submit a source audio file for processing.
   * Returns a job record — callers should persist it to `audio_jobs`.
   */
  submitJob(
    inputAssetUrl: string,
    settings: AudioJobSettings,
  ): Promise<AudioJob>;

  /**
   * Poll job status by provider job ID.
   * When status == 'done', `outputAssetUrls` will be populated.
   */
  pollJob(jobId: string): Promise<AudioJob>;

  /** Cancel a running job. Returns the final job record. */
  cancelJob(jobId: string): Promise<AudioJob>;
}

// ─── Provider capability registry ─────────────────────────────────────────────

/**
 * Declares which contracts a provider implementation satisfies.
 * Used by the integration settings UI to show available features per provider.
 *
 * Example:
 *   const SoundchartsCapabilities: ProviderCapabilities = {
 *     provider: 'soundcharts',
 *     label: 'Soundcharts',
 *     contracts: ['playlist', 'competitor', 'audience', 'artist'],
 *     credentialsRequired: ['VITE_SOUNDCHARTS_API_KEY'],
 *     docsUrl: 'https://customer.api.soundcharts.com/docs',
 *   };
 */
export type ContractName =
  | 'artist'
  | 'release'
  | 'playlist'
  | 'audience'
  | 'competitor'
  | 'audio_workflow';

export interface ProviderCapabilities {
  provider: string;
  label: string;
  contracts: ContractName[];
  credentialsRequired: string[];
  /** URL to the provider's API docs — for developer reference only */
  docsUrl?: string;
  /** Recommended sync cadence in minutes (0 = event-driven) */
  syncCadenceMinutes?: number;
}

/**
 * Provider capability declarations.
 * These are informational — they DO NOT require the providers to be implemented.
 * The UI can read these to show configuration requirements and feature availability.
 */
export const PROVIDER_CAPABILITIES: ProviderCapabilities[] = [
  {
    provider: 'soundcharts',
    label: 'Soundcharts',
    contracts: ['artist', 'release', 'playlist', 'audience', 'competitor'],
    credentialsRequired: ['VITE_SOUNDCHARTS_APP_ID', 'VITE_SOUNDCHARTS_API_TOKEN'],
    docsUrl: 'https://customer.api.soundcharts.com/docs',
    syncCadenceMinutes: 1440, // Daily
  },
  {
    provider: 'songstats',
    label: 'Songstats',
    contracts: ['artist', 'release', 'playlist', 'audience'],
    credentialsRequired: ['VITE_SONGSTATS_API_KEY'],
    docsUrl: 'https://docs.songstats.com',
    syncCadenceMinutes: 720, // Twice daily
  },
  {
    provider: 'auphonic',
    label: 'Auphonic',
    contracts: ['audio_workflow'],
    credentialsRequired: ['VITE_AUPHONIC_API_KEY'],
    docsUrl: 'https://auphonic.com/api/docs',
    syncCadenceMinutes: 0, // Event-driven
  },
  {
    provider: 'spotify',
    label: 'Spotify',
    contracts: ['artist', 'release', 'audience'],
    credentialsRequired: ['VITE_SPOTIFY_CLIENT_ID', 'VITE_SPOTIFY_CLIENT_SECRET'],
    docsUrl: 'https://developer.spotify.com/documentation/web-api',
    syncCadenceMinutes: 1440,
  },
  {
    provider: 'zernio',
    label: 'Zernio',
    contracts: [],
    credentialsRequired: ['VITE_ZERNIO_API_KEY'],
    docsUrl: 'https://zernio.io/docs',
    syncCadenceMinutes: 60,
  },
];
