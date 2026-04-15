# Future Integrations Plan

## Recommended Providers By Use Case

| Use case | Recommended provider | Why | Source of truth |
| --- | --- | --- | --- |
| Artist and track analytics | Songstats | Strong cross-platform artist and song performance coverage | `report_snapshots`, analytics dashboard |
| Playlisting and market intelligence | Soundcharts | Better fit for playlist events, benchmark tracking, and territory context | `playlist_events`, `competitor_snapshots` |
| Competitor benchmarking | Soundcharts | Market and artist comparison is the strongest early fit here | `competitor_artists`, `competitor_snapshots` |
| Social/content publishing | Zernio | Existing scheduling footprint in Artist OS and clear hourly sync need | `integration_accounts`, `sync_jobs`, content modules |
| Audio post-processing | Auphonic | Dedicated audio workflow automation instead of forcing analytics tools into production work | `audio_jobs`, release and ideas workflows |

## Required Credentials

| Provider | Credentials | Notes |
| --- | --- | --- |
| Zernio | API key, connected account IDs | Sync hourly for account and scheduling state |
| Spotify | OAuth client id/secret, refresh token | Read-only analytics and release metadata |
| SoundCloud | OAuth client id/secret, refresh token | Read-only catalog and track stats |
| Songstats | API key or OAuth depending on plan | Treat as analytics source, not publishing source |
| Soundcharts | API key | Best used for playlisting and competitor intelligence |
| Auphonic | API key | Background jobs for mastering/post-processing |

## Sync Cadence Recommendations

| Provider | Recommended cadence | Notes |
| --- | --- | --- |
| Zernio | Hourly | Content schedule state and post status can change quickly |
| Spotify | Daily | Analytics lag makes hourly sync low value |
| SoundCloud | Daily | Enough for catalog and performance updates |
| Songstats | Daily or twice daily | Depends on reporting expectations |
| Soundcharts | Daily | More useful as snapshots than constant polling |
| Auphonic | Event-driven | Trigger when an audio workflow job is created |

## Provider Contracts

- Artist analytics: summary metrics, audience deltas, source attribution, last sync state.
- Release analytics: per-release totals, trends, external ids, sync provenance.
- Playlist analytics: playlist events, notable playlist metadata, recent adds, provider source.
- Audience analytics: follower growth, geography, listener segmentation.
- Competitor analytics: tracked competitor roster, daily/weekly snapshots, comparative metrics.
- Audio workflow processing: uploaded source asset, job status, output URLs, processing notes.

## Proposed Tables

- `playlist_events`
  - `id`, `release_id`, `provider`, `playlist_name`, `playlist_id`, `event_type`, `occurred_at`, `metadata`, `created_at`
- `competitor_artists`
  - `id`, `name`, `provider_artist_id`, `notes`, `created_at`, `updated_at`
- `competitor_snapshots`
  - `id`, `competitor_artist_id`, `provider`, `snapshot_date`, `metrics`, `created_at`
- `report_snapshots`
  - `id`, `report_type`, `range_start`, `range_end`, `payload`, `created_at`
- `audio_jobs`
  - `id`, `provider`, `input_asset_url`, `output_asset_url`, `status`, `settings`, `error_message`, `created_at`, `updated_at`

## UI Modules Affected

- Dashboard sync status and weekly reporting
- Analytics overview, playlisting, audience, and release performance modules
- Releases detail pages for playlist adds and assets
- Ideas audio workflow and review surfaces
- Calendar for content and task planning informed by provider sync state
- Network/outreach for campaign and pitching context

