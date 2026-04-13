# Artist OS

A comprehensive artist management web application built with React 19, Vite, TypeScript, Supabase, and Tailwind CSS with glassmorphism design.

## Architecture

- **Frontend**: React 19 + Vite + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Social Media Integration**: Zernio API for cross-platform posting/scheduling
- **Design System**: Glassmorphism (`glass-card` class), font-black headings, rounded-[2.5rem] cards

## Key Features

### Content Engine (`src/pages/ContentEngine.tsx`)
- **Content Pipeline**: Kanban board for managing content lifecycle (idea → drafted → ready → scheduled → posted)
- **Scheduling Tab**: Full scheduling manager with platform/status/date filters, quick publish/cancel actions
- **Performance Analytics**: Track content performance across platforms
- **Strategy & Planning**: AI-powered content recommendations and weekly planning

### Social Media Scheduling System
- **PostComposerModal** (`src/content/components/PostComposerModal.tsx`): Unified create/edit modal with platform-specific settings, scheduling with best posting times, and publish status management
- **PlatformSettingsForm** (`src/content/components/PlatformSettingsForm.tsx`): Config-driven platform settings (Instagram/TikTok/YouTube/Twitter) rendered from registry
- **BestPostingTimes** (`src/content/components/BestPostingTimes.tsx`): Displays Zernio-powered best times to post per platform
- **SchedulingManager** (`src/content/components/SchedulingManager.tsx`): Full scheduling dashboard with filtering, quick actions, and status tracking
- **Platform Settings Registry** (`src/content/platformSettingsRegistry.ts`): Centralized config for per-platform fields (privacy, content type, comments, etc.)

### Calendar (`src/pages/Calendar.tsx`)
- Month/Week/Day views with drag-and-drop event management
- Publish-status-based color coding for content posts (draft=gray, scheduled=blue, published=green, failed=red, cancelled=amber)
- Status legend sidebar
- SoundCloud and Spotify sync integration

### Content Types (`src/content/types.ts`)
- `ContentItem`: Extended with `publish_status`, `platform_settings`, `zernio_post_id`, `publish_error`
- `PublishStatus`: draft | scheduled | published | failed | cancelled
- `BestPostingTime`: Platform-specific best posting time data
- `PublishLog`: Audit trail for publish actions

### Content Persistence (`src/content/services/contentPersistence.ts`)
- Bridges `scheduled_at` (ISO string in UI) to `scheduled_date`/`scheduled_time` (Supabase columns)
- Persists all lifecycle transitions (draft/scheduled/published/failed/cancelled) to Supabase
- Handles upsert for new items (inserts) and existing items (updates)
- All scheduling/publishing/cancel actions in ContentEngine write through this layer

### Zernio Integration (`src/content/services/zernioAdapter.ts`)
- Post content immediately or schedule for future
- Cancel scheduled posts
- Fetch best posting times (with mock fallback when API key absent)
- Publish logging to `publish_logs` table
- Analytics sync

## Database Schema (`supabase-schema.sql`)
- `content_items`: Extended with `publish_status`, `platform_settings` (JSONB), `zernio_post_id`, `media_url`, `publish_error`
- `publish_logs`: Tracks all publish/schedule/cancel actions with Zernio responses
- Other tables: `releases`, `shows`, `meetings`, `todos`, `goals`, `finance`, `inbox`, `bot_resources`, `opportunities`, `profiles`

## Environment Variables
- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase anonymous key
- `VITE_ZERNIO_API_KEY`: Zernio API key (optional; mock data used when absent)
- `VITE_SOUNDCLOUD_CLIENT_ID`: SoundCloud OAuth client ID
- `VITE_SPOTIFY_CLIENT_ID`: Spotify OAuth client ID

## Running
```bash
npm run dev
```
The app starts on port 5173 with Vite dev server.
