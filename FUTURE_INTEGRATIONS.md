# Future Integrations Architecture

> **Status:** Architecture designed, contracts written, schema tables added.  
> No API implementations exist yet — this document is the source of truth for
> what to build and in what order.

---

## Architecture Overview

Artist OS uses a **two-layer analytics architecture**:

### Layer 1 — Dashboard Aggregation (`AnalyticsProvider`)
Defined in `src/services/analytics/baseProvider.ts`. Providers implement:
```typescript
interface AnalyticsProvider {
  id: string;
  label: string;
  load(): Promise<AnalyticsDomainPayload>;
  getState(): Promise<AnalyticsProviderState>;
}
```
Registered in `src/services/analytics/index.ts` as `ANALYTICS_REGISTRY`. Used exclusively by
`useAnalytics()` hook → `AnalyticsDashboard` component. All three current entries (Spotify,
Songstats, Soundcharts) are stubs returning `emptyAnalyticsPayload`.

### Layer 2 — Domain Intelligence Contracts
Defined in `src/services/analytics/providerContracts.ts`. Six typed contracts cover specialised
use cases that don't fit in the flat dashboard payload:

| Contract | Interface | Primary Provider | DB Table |
|---|---|---|---|
| Artist analytics | `ArtistAnalyticsContract` | Songstats | `report_snapshots` |
| Release analytics | `ReleaseAnalyticsContract` | Songstats / Spotify | `report_snapshots` |
| Playlist intelligence | `PlaylistAnalyticsContract` | Soundcharts | `playlist_events` |
| Audience analytics | `AudienceAnalyticsContract` | Soundcharts / Spotify | `report_snapshots` |
| Competitor benchmarking | `CompetitorAnalyticsContract` | Soundcharts | `competitor_artists`, `competitor_snapshots` |
| Audio post-processing | `AudioWorkflowContract` | Auphonic | `audio_jobs` |

A single provider SDK can implement multiple contracts. The contracts are intentionally
provider-agnostic — swapping a provider requires only a new implementation class, not changing
any consumer code.

---

## Provider Capabilities Registry

`PROVIDER_CAPABILITIES` in `providerContracts.ts` is the machine-readable registry of what each
provider supports. Add a new entry here when onboarding a provider; the UI can query it to
conditionally show features only when the matching provider is configured.

```typescript
const PROVIDER_CAPABILITIES: ProviderCapabilities[] = [
  { provider: 'soundcharts', contracts: ['artist','release','playlist','audience','competitor'], syncCadenceMinutes: 1440 },
  { provider: 'songstats',   contracts: ['artist','release','playlist','audience'],             syncCadenceMinutes: 720  },
  { provider: 'auphonic',    contracts: ['audio_workflow'],                                     syncCadenceMinutes: 0    }, // event-driven
  { provider: 'spotify',     contracts: ['artist','release','audience'],                        syncCadenceMinutes: 1440 },
  { provider: 'zernio',      contracts: [],                                                      syncCadenceMinutes: 60   },
];
```

---

## Source-of-Truth Ownership

| Capability | Source of Truth | Fallback | Rationale |
|---|---|---|---|
| Playlisting / editorial | Soundcharts | Songstats | Soundcharts has the deepest editorial metadata and new-adds webhook support |
| Competitor benchmarking | Soundcharts | — | Market share, audience overlap, and momentum are Soundcharts specialties |
| Cross-platform streaming | Songstats | Spotify | Songstats aggregates Spotify, Apple Music, YouTube, Amazon, Deezer in one call |
| Artist audience data | Songstats | Spotify | Full audience growth timeline via Songstats; Spotify fills in demographic splits |
| Audio post-processing | Auphonic | — | Mastering, transcription, chapter marks — no analytics overlap |
| Scheduling / publishing | Zernio | — | Already partially in Artist OS; hourly sync gives near-real-time post state |

---

## Provider Details

### Soundcharts
**Tier:** Intelligence & Playlisting  
**Credentials:** API key (`SOUNDCHARTS_API_KEY` env var)  
**Auth:** Bearer token on every request  
**Rate limits:** ~100 req/min on standard plan; use bulk endpoints where possible  
**Base URL pattern:** `https://customer.api.soundcharts.com/api/v2/`

**Implemented contracts when live:**
- `ArtistAnalyticsContract` — `getArtistSnapshot`, `getArtistHistory`  
  → Key endpoints: `/artist/{uuid}/streaming/spotify/listeners/latest`, `/artist/{uuid}/streaming/charts`
- `PlaylistAnalyticsContract` — `getPlaylistSnapshot`, `getPlaylistHistory`  
  → Key endpoint: `/song/{isrc}/playlist/spotify/current`, `/song/{isrc}/playlist/spotify/added`
- `CompetitorAnalyticsContract` — `getCompetitorSnapshot`, `getCompetitorBatch`, `searchArtist`  
  → Key endpoint: `/artist/search`, `/artist/{uuid}/streaming/spotify/listeners/latest`
- `AudienceAnalyticsContract` — `getAudienceSnapshot`  
  → Key endpoint: `/artist/{uuid}/audience/report`

**Sync schedule:** Daily at 02:00 UTC (nightly cron). Log output to `sync_jobs` table.

---

### Songstats
**Tier:** Cross-Platform Streaming Analytics  
**Credentials:** API key (`SONGSTATS_API_KEY` env var); some endpoints require OAuth  
**Auth:** `apikey` query param or Authorization header depending on endpoint  
**Rate limits:** 60 req/min on starter plan  
**Base URL pattern:** `https://api.songstats.com/enterprise/v1/`

**Implemented contracts when live:**
- `ArtistAnalyticsContract` — `getArtistSnapshot`, `getArtistHistory`  
  → Key endpoint: `/artists/stats?artist_id={id}`
- `ReleaseAnalyticsContract` — `getReleaseSnapshot`, `getReleaseHistory`  
  → Key endpoint: `/tracks/stats?isrc={isrc}`
- `PlaylistAnalyticsContract` — `getPlaylistSnapshot` (volume only, not editorial detail)  
  → Key endpoint: `/tracks/playlist_stats?isrc={isrc}`
- `AudienceAnalyticsContract` — `getAudienceSnapshot`  
  → Key endpoint: `/artists/audience?artist_id={id}`

**Sync schedule:** Daily at 03:00 UTC or twice-daily if reporting SLA requires T+12h freshness.

---

### Auphonic
**Tier:** Audio Post-Processing Workflow  
**Credentials:** API key or HTTP Basic Auth (`AUPHONIC_API_KEY` env var)  
**Auth:** Basic auth with username=API key  
**Rate limits:** Job queue based; no strict req/min limit but concurrent job limits apply  
**Base URL pattern:** `https://auphonic.com/api/`

**Implemented contracts when live:**
- `AudioWorkflowContract` — `submitJob`, `pollJob`, `cancelJob`  
  → `submitJob` → `POST /productions.json`  
  → `pollJob`   → `GET /production/{uuid}.json`  
  → `cancelJob` → `POST /production/{uuid}/stop.json`

**Sync schedule:** Event-driven. When `audio_jobs.status = 'processing'`, a cron polls every 5 minutes until terminal state (`done` / `error` / `cancelled`).

**Presets:** Store Auphonic preset UUIDs in `AudioJobSettings.preset`. Maintain a named preset per use case (e.g. `wes_master_v1`, `wes_podcast_v1`) inside the Auphonic dashboard.

---

### Spotify
**Tier:** First-Party Release & Audience Data  
**Credentials:** OAuth client ID/secret + refresh token per-user (`VITE_SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, per-user refresh in `integration_accounts`)  
**Auth:** OAuth 2.0 PKCE (user-facing) or Client Credentials (server-side read-only)  
**Rate limits:** ~100 req/min; retry on 429 with `Retry-After` header  
**Base URL pattern:** `https://api.spotify.com/v1/`

**Implemented contracts when live:**
- `ArtistAnalyticsContract` (read-only monthly listeners)  
  → `GET /artists/{id}`
- `ReleaseAnalyticsContract` (catalog metadata, not streaming counts directly)  
  → `GET /albums/{id}`, `GET /tracks/{id}`
- `AudienceAnalyticsContract` (demographics via Spotify for Artists API — requires verified artist login)

**Note:** Spotify's public API does not expose stream counts. True streaming data requires
Spotify for Artists OAuth or a third-party aggregator (Songstats). Use Spotify primarily
for catalog metadata synchronisation and "verify by Spotify" checks.

---

### Zernio
**Tier:** Social Scheduling & Publishing  
**Credentials:** API key (`ZERNIO_API_KEY` env var)  
**Auth:** Bearer token  
**Rate limits:** Hourly polling is within typical limits; confirm on plan  
**Sync schedule:** Every 60 minutes via `sync_jobs` cron

**Implemented contracts when live:** None of the six intelligence contracts — Zernio's scope is
publishing state sync. It writes to `content_posts`, updating `platform_status` and
`published_at` fields. The `PROVIDER_CAPABILITIES` registry reflects `contracts: []` for this reason.

---

## Database Schema

All five tables were originally described in the old schema file. The active baseline is now `supabase-baseline-v3.sql`.
for the full column definitions and index declarations.

### `playlist_events`
Stores individual playlist add/remove/editorial events per release. Provider-sourced via
`PlaylistAnalyticsContract.getPlaylistHistory()` and synced nightly.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | `uuid_generate_v4()` |
| `release_id` | UUID FK → `releases` | Nullable (event may arrive before release row exists) |
| `isrc` | TEXT | Stored separately for resilience if release FK changes |
| `provider` | TEXT | `'soundcharts'` or `'songstats'` |
| `platform` | TEXT | e.g. `'spotify'`, `'apple_music'` |
| `playlist_id` | TEXT | Provider-assigned playlist ID |
| `playlist_name` | TEXT | Display label |
| `playlist_followers` | INTEGER | Snapshot of follower count at time of event |
| `curator` | TEXT | Identity of the curator / editorial team |
| `territory` | TEXT | ISO country code or `'global'` |
| `event_type` | TEXT CHECK | `added \| removed \| editorial_pick \| algorithmic` |
| `is_editorial` | BOOLEAN | `true` = pitched/curated; `false` = algorithmic |
| `estimated_streams_per_day` | INTEGER | Provider estimate; nullable |
| `occurred_at` | TIMESTAMPTZ | When the event happened at source |
| `metadata` | JSONB | Provider-specific overflow |
| `created_at` | TIMESTAMPTZ | Row insert time |

**Indexes:** `release_id`, `isrc`, `occurred_at DESC`

---

### `competitor_artists`
Roster of artists being tracked for benchmarking. Manually curated by the team.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID FK → `auth.users` | Owner of the tracked roster |
| `name` | TEXT | Display name |
| `soundcharts_id` | TEXT | Soundcharts artist UUID |
| `songstats_id` | TEXT | Songstats artist ID |
| `spotify_artist_id` | TEXT | For verification links |
| `notes` | TEXT | Internal notes about why this artist is tracked |
| `is_active` | BOOLEAN | Soft-disable without deleting history |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

---

### `competitor_snapshots`
Daily metric snapshots per tracked competitor from `CompetitorAnalyticsContract.getCompetitorBatch()`.
One row per `(competitor_artist_id, provider, snapshot_date)` — UNIQUE constraint prevents duplicates.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `competitor_artist_id` | UUID FK → `competitor_artists` | CASCADE delete |
| `provider` | TEXT | Source provider |
| `snapshot_date` | DATE | The calendar date of the snapshot |
| `monthly_listeners` | INTEGER | Fast-query column |
| `total_followers` | INTEGER | Cross-platform aggregate |
| `playlist_count` | INTEGER | Active playlist placements |
| `momentum` | TEXT CHECK | `rising \| stable \| declining \| unknown` |
| `audience_overlap` | NUMERIC(5,4) | 0.0–1.0 overlap vs. primary artist |
| `metrics` | JSONB | Full raw snapshot for forward-compat |
| `created_at` | TIMESTAMPTZ | |

**Index:** `(competitor_artist_id, snapshot_date DESC)`

---

### `report_snapshots`
Persisted `WeeklyReport` JSON payloads. Serves two purposes:
1. **Cache**: Avoid regenerating expensive reports — load from snapshot if one exists for the requested range.
2. **History**: Enable trend comparison across weekly reports over time.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID FK → `auth.users` | |
| `report_type` | TEXT | `'weekly' \| 'monthly' \| 'release'` |
| `label` | TEXT | Human-readable e.g. `"Week of Apr 14"` |
| `range_start` | DATE | |
| `range_end` | DATE | |
| `payload` | JSONB | Full `WeeklyReport` shape from `domain.ts` |
| `sections` | TEXT[] | Which section IDs are included |
| `created_by` | UUID FK → `auth.users` | |
| `created_at` | TIMESTAMPTZ | |

**Integration with `reportService.ts`:** Add a save step at the end of `buildWeeklyReport()` that
inserts the result into `report_snapshots`. On open of `WeeklyReportModal`, check for an existing
snapshot before generating.

**Index:** `(user_id, range_start DESC)`

---

### `audio_jobs`
Tracks `AudioWorkflowContract` jobs submitted to Auphonic (or future providers).
Linked to source entities via `related_type + related_id` polymorphic FK.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID FK → `auth.users` | |
| `related_type` | TEXT CHECK | `release \| idea` |
| `related_id` | UUID | Polymorphic — points to `releases.id` or `ideas.id` |
| `provider` | TEXT | Default `'auphonic'` |
| `provider_job_id` | TEXT | Provider-assigned UUID for polling |
| `status` | TEXT CHECK | `pending \| processing \| done \| error \| cancelled` |
| `input_asset_url` | TEXT | Source audio URL |
| `output_asset_urls` | TEXT[] | Completed output URLs (mp3, wav, etc.) |
| `settings` | JSONB | `AudioJobSettings` shape from `providerContracts.ts` |
| `error_message` | TEXT | Set when status = `'error'` |
| `started_at` | TIMESTAMPTZ | Provider accepted the job |
| `completed_at` | TIMESTAMPTZ | Job reached terminal state |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | Updated by polling cron |

**Indexes:** `(user_id, created_at DESC)`, `(related_type, related_id)`

---

## Implementation Priority

Build in this order to deliver value incrementally:

### Phase 1 — Playlist Intelligence (Soundcharts)
**Why first:** Playlist adds are operationally critical. Artists and managers need to know within
24 hours when a track gets on a playlist or gets removed.

Tasks:
1. Add `SOUNDCHARTS_API_KEY` to env and `server.ts` proxy whitelist
2. Implement `SoundchartsProvider` satisfying `PlaylistAnalyticsContract`
3. Add a nightly sync route in `server.ts` → write events to `playlist_events`
4. Build `PlaylistIntelligencePanel` component (list of recent adds grouped by platform)
5. Show playlist event count badge on release detail pages

---

### Phase 2 — Cross-Platform Streaming (Songstats)
**Why second:** Closes the biggest analytics gap — seeing streams across all DSPs in one view.

Tasks:
1. Add `SONGSTATS_API_KEY` to env
2. Implement `SongstatsProvider` satisfying `ArtistAnalyticsContract` + `ReleaseAnalyticsContract`
3. Wire `SongstatsProvider` into `ANALYTICS_REGISTRY` in `src/services/analytics/index.ts`
4. Replace `emptyAnalyticsPayload` stubs in `AnalyticsDashboard` with real data
5. Add 7-day stream trend sparklines to release detail pages

---

### Phase 3 — Competitor Benchmarking (Soundcharts)
**Why third:** Higher-level strategic feature — requires Phase 1 Soundcharts auth already in place.

Tasks:
1. Add competitor roster UI (simple table + add button)
2. Implement `CompetitorAnalyticsContract` on `SoundchartsProvider`
3. Nightly cron writes to `competitor_snapshots`
4. Build `CompetitorBenchmarkPanel` with momentum indicators and audience overlap bars

---

### Phase 4 — Audio Jobs (Auphonic)
**Why fourth:** Valuable but standalone — doesn't depend on any other phase.

Tasks:
1. Add `AUPHONIC_API_KEY` to env
2. Implement `AudioWorkflowContract`
3. Add "Send to Auphonic" action on Ideas and Releases pages
4. Background polling cron updates `audio_jobs.status` every 5 minutes
5. Notify user (Toast) when job reaches `done` or `error` state

---

### Phase 5 — Report Archiving
**Why last:** Depends on all data layers being real (Phases 1–4).

Tasks:
1. In `reportService.ts → buildWeeklyReport()`: insert result into `report_snapshots` before returning
2. In `WeeklyReportModal` config phase: check for existing snapshot → offer "Load saved report"
3. Add a `ReportHistoryPanel` to the dashboard that lists past snapshots

---

## Adding a New Provider

1. **Add to `IntegrationProvider` union** in `src/types/domain.ts`
2. **Implement the relevant contract(s)** in `src/services/<provider>Provider.ts`
3. **Register in `PROVIDER_CAPABILITIES`** in `providerContracts.ts`
4. **Add dashboard aggregation** by implementing `AnalyticsProvider` and pushing to `ANALYTICS_REGISTRY` in `src/services/analytics/index.ts` (optional — only if the provider contributes to the analytics dashboard)
5. **Add credentials** to `.env.example` and document in this file under Provider Details
6. **Add a sync cron** in `server.ts` if the provider requires periodic polling

---

## Environment Variables Reference

```bash
# Analytics / Intelligence
SOUNDCHARTS_API_KEY=
SONGSTATS_API_KEY=

# Audio processing
AUPHONIC_API_KEY=

# Publishing / scheduling
ZERNIO_API_KEY=

# First-party platforms (OAuth flows handled in server.ts)
VITE_SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SOUNDCLOUD_CLIENT_ID=
SOUNDCLOUD_CLIENT_SECRET=

# Already in use
VITE_GEMINI_API_KEY=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

---

## UI Modules Affected by Phase

| Module | Phase | Change |
|---|---|---|
| `AnalyticsDashboard` | 2 | Replace stub data with Songstats streams |
| Release detail pages | 1, 2, 4 | Playlist badge, stream trend, audio job status |
| Ideas pages | 4 | "Send to Auphonic" action, job status tracker |
| Dashboard `ActionBar` | 5 | "Load saved report" option in WeeklyReportModal |
| New: `PlaylistIntelligencePanel` | 1 | Editorial adds/removes feed |
| New: `CompetitorBenchmarkPanel` | 3 | Momentum chart, audience overlap |
| New: `ReportHistoryPanel` | 5 | Past weekly reports list |
| `sync_jobs` / Settings integrations page | All | Auth status, last-synced time per provider |
