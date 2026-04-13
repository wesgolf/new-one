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
- **Content Tab**: List view of uploaded content with platform/status/date filters, click to edit
- **Scheduling Tab**: Full scheduling manager with platform/status/date filters, quick publish/cancel actions
- **Performance Analytics**: Track content performance across platforms
- **Strategy & Planning**: AI-powered content recommendations and weekly planning
- **Upload Content**: Opens PostEditor for MP4 upload → platform selection → edit → schedule/post flow

### MP4 Upload → Edit → Schedule/Post Flow
Core flow: Upload .mp4 → create content_item + content_asset → select platforms → create platform_posts → edit per-platform details → Post Now or Schedule

- **PostEditor** (`src/content/components/PostEditor.tsx`): Main 3-step modal (upload → platforms → editor). Creates content_items and platform_posts in Supabase, manages video preview, and integrates with publish/schedule services.
- **UploadDropzone** (`src/content/components/UploadDropzone.tsx`): Drag-and-drop + file picker for .mp4 files (strict MP4 validation). Uploads to Supabase Storage with progress indicator.
- **PlatformTabs** (`src/content/components/PlatformTabs.tsx`): Platform-specific editing tabs for Instagram (caption, hashtags, cover image, share-to-feed, trial reel), TikTok (caption, hashtags, privacy, comments/duet/stitch toggles), YouTube Shorts (title, description, tags, category, audience, privacy).
- **ScheduleControls** (`src/content/components/ScheduleControls.tsx`): Post Now / Schedule for Later with date/time picker, validation (future time check), and success/error feedback.
- **ContentListView** (`src/content/components/ContentListView.tsx`): List of all uploaded content items with platform posts, filterable by platform/status/search.

### Service Layer
- **contentService** (`src/services/contentService.ts`): Supabase CRUD for content_items, content_assets, platform_posts. Upload to Supabase Storage.
- **publishService** (`src/services/publishService.ts`): Orchestrates publish/schedule/cancel flows. Platform-specific validation. Logs to publish_logs using content_item_id. Status transitions on platform_posts.
- **zernioService** (`src/services/zernioService.ts`): Platform-specific Zernio API stubs (publishInstagramPost, publishTikTokPost, publishYouTubeShort + schedule variants). Mock fallback when VITE_ZERNIO_API_KEY absent. TODO markers for endpoint finalization.

### Legacy Content System (still active for Pipeline/Scheduling tabs)
- **PostComposerModal** (`src/content/components/PostComposerModal.tsx`): Unified create/edit with platform-specific settings
- **SchedulingManager** (`src/content/components/SchedulingManager.tsx`): Scheduling dashboard
- **contentPersistence** (`src/content/services/contentPersistence.ts`): Bridges scheduled_at to Supabase columns
- **zernioAdapter** (`src/content/services/zernioAdapter.ts`): Original Zernio integration

### Calendar (`src/pages/Calendar.tsx`)
- Month/Week/Day views with drag-and-drop event management
- Publish-status-based color coding for content posts (draft=gray, scheduled=blue, published=green, failed=red, cancelled=amber)
- Displays both content_items and platform_posts as calendar events
- Status legend sidebar
- SoundCloud and Spotify sync integration

## Database Schema (`supabase-schema.sql`)

### Core Tables
- `content_items`: Title, platform, status, publish_status, platform_settings (JSONB), media_url, campaign, notes, scheduled_date/time
- `content_assets`: Uploaded media files (file_url, file_path, file_name, mime_type, asset_type, duration_seconds, thumbnail_url) linked to content_items
- `platform_posts`: Per-platform child posts (platform, status, caption, title, description, hashtags, platform_settings_json JSONB, scheduled_at, published_at, external IDs, error_message) linked to content_items
- `publish_logs`: Audit trail for publish/schedule/cancel actions with Zernio responses

### Other Tables
- `releases`, `shows`, `meetings`, `todos`, `goals`, `finance`, `inbox`, `bot_resources`, `opportunities`, `profiles`

### Data Model
One parent `content_item` → many child `platform_posts` (one per platform)
One `content_item` → many `content_assets` (uploaded media files)
Platform-specific settings stored in `platform_settings_json` JSONB, not hardcoded columns

## Content Types (`src/content/types.ts`)
- `ContentItem`: Core content entity
- `ContentAsset`: Uploaded media file record
- `PlatformPost`: Per-platform post with status/settings/scheduling
- `ContentItemWithAssets`: Extended content item with assets and platform_posts
- `PlatformPostStatus`: draft | scheduled | publishing | published | failed | cancelled
- `PublishStatus`: draft | scheduled | published | failed | cancelled

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
