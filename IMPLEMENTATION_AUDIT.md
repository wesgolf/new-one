# IMPLEMENTATION AUDIT — Artist OS (WES)

> Last updated after two full production-readiness passes.  
> All critical bugs listed here were fixed in the same pass they were found.

---

## Executive Summary

| Category | Status |
|---|---|
| TypeScript compilation | ✅ 0 errors |
| Routing (all 15 routes) | ✅ Verified |
| Auth & role guards | ✅ Wired correctly |
| Real data loading | ✅ Fixed (was using mock init) |
| CSS design tokens | ✅ Fixed (3 missing variables added) |
| Animation imports | ✅ Fixed (14 files importing wrong package) |
| Global search | ✅ Rewired to real Supabase queries |
| Dead code | ✅ Removed (Sidebar.tsx, navigation.ts) |
| Strategy page fake data | ✅ Replaced with real computed metrics |
| Calendar drag-and-drop | ✅ Fixed (task_/pp_ ID prefix bugs) |
| Release detail stubs | ✅ Replaced with explicit "Not linked" states |
| Zernio silent fake success | ✅ Fixed — returns honest error when unconfigured |
| Publishing integration UX | ✅ Banner shown in PostComposerModal |
| Analytics setup states | ✅ Provider cards show env var hints |
| Env validation utility | ✅ Created src/lib/envConfig.ts |
| Nav path mismatch | ✅ Fixed (/opportunities → /network in GlobalSearch) |
| Design token normalization | ✅ Page headers use text-text-primary/secondary |
| Integration stubs | ℹ Documented (intentional, awaiting credentials only) |

---

## Fixes Applied This Session

### 1. Critical — `framer-motion` imports (14 files)
**Problem:** 14 source files were importing from `'framer-motion'` which is **not installed** in `package.json`. Only `motion` v12 is installed. This would have caused a runtime crash on the entire Content Engine section.

**Files fixed:**
- `src/pages/ContentEngine.tsx`
- `src/content/components/ContentCreatorPanel.tsx`
- `src/content/components/ContentLibrary.tsx`
- `src/content/components/ContentListView.tsx`
- `src/content/components/EngagementHub.tsx`
- `src/content/components/PostComposerModal.tsx`
- `src/content/components/PostEditor.tsx`
- `src/content/components/PostModeModal.tsx`
- `src/content/components/ReflectionCard.tsx`
- `src/content/components/ScheduleControls.tsx`
- `src/content/components/SchedulerPanel.tsx`
- `src/content/components/SchedulingManager.tsx`
- `src/content/components/UploadDropzone.tsx`
- `src/content/components/WeeklyContentCalendar.tsx`

**Fix:** Mass `sed` replacement → all now import from `'motion/react'`.

---

### 2. Critical — Missing CSS design tokens
**Problem:** Multiple components used CSS utility classes that referenced undefined Tailwind tokens. Affected text/background would have been invisible (transparent) or the wrong color.

Missing tokens:
| Token used | Issue |
|---|---|
| `text-text-tertiary` | ~50+ usages across dashboard widgets, modals, search, forms |
| `bg-light-surface` | Used in `GlobalSearchOverlay` modal background |
| `bg-light-surface-secondary` | Used in search result hover states |

**Fix:** Added to `src/index.css` `@theme` block:
```css
--color-text-tertiary: #9d9aaa;
--color-light-surface: #ffffff;
--color-light-surface-secondary: #f0eff0;
```

---

### 3. High — Content Engine loading mock data
**Problem:** `ContentEngine.tsx` initialized both the releases and items state with mock data from `src/content/mockData.ts`. Real releases and content items were never loaded. The pipeline board always showed fake test tracks.

**Also:** `user_id` was hardcoded as `'user_1'` in 3 places — saved records would be orphaned from the real auth user.

**Fix:**
- Removed `import { mockReleases, mockContentItems } from '../content/mockData'`
- Added `fetchReleases()` from `supabaseData.ts` and `contentService.getContentItemsWithPosts()` calls on mount
- Added `useCurrentUser()` hook and wired `authUser?.id` to all `user_id` fields

---

### 4. Medium — Global Search was 100% mock
**Problem:** `GlobalSearchOverlay.tsx` always showed hardcoded fake results ("Dance Floor Ambient Mix", "Summer Vibes EP", etc.) regardless of query.

**Fix:** Complete rewrite to query Supabase in parallel across `ideas`, `releases`, `content_items`, and `tasks` tables with a 250ms debounce. Navigation uses `react-router-dom`'s `useNavigate` instead of `window.location.href` (preserves SPA state). Also replaced the XSS-prone `<a href>` click handler with a `<button>` + navigate pattern.

---

### 5. Minor — GoalTracker page used legacy slate classes
**Problem:** `GoalTracker.tsx` page header used `text-slate-900` / `text-slate-500` instead of the app's design system tokens.

**Fix:** Changed to `text-text-primary` / `text-text-secondary`.

---

## Production Readiness: Page-by-Page

### `/` — Command Center
- **Data:** Real (Supabase via `useDashboard` hook — pulls releases, tasks, goals, content items, calendar events)
- **Auth:** ✅ Protected route → redirects to `/unauthorized`
- **Role aware:** ✅ Manager layout vs Artist layout
- **Features verified:** ActionBar → Generate Report (WeeklyReportModal) ✅, Sync Now → `syncService.syncNow('all')` ✅, AI Assistant → opens GlobalAssistantDrawer ✅

### `/ideas` — Track Ideas
- **Data:** Real (Supabase `ideas` table via `fetchIdeas()`)
- **Auth:** ✅ Protected
- **Role aware:** ✅ `canCreateTrack` gates New/Edit/Delete controls
- **Features:** Status filters, collab filter, sort, search, `AudioReviewModal`, `IdeaFormModal`, share link copy, collab portal link

### `/releases` — Release Tracker
- **Data:** Real (`fetchReleases()` from Supabase)
- **Auth:** ✅ Protected
- **Role aware:** ✅ `canCreateTrack` gates New Release button
- **Features:** Status tabs (all/unreleased/scheduled/released), search/sort, `ReleaseFormModal`, delete confirm dialog, links to release detail

### `/releases/:releaseId` — Release Detail
- **Data:** Real (`fetchReleaseById()`)
- **Public mode:** ✅ Works without auth when `?public=1` or via direct URL
- **Features verified:** Cover art hero, meta chips (BPM/key/ISRC with clipboard copy), streaming links (Spotify + SoundCloud from stored IDs), playlisting intel grid, assets section, Edit button (role-gated), Share button (copies URL)
- **placeholders:** Apple Music / YouTube links shown as greyed stubs pending stored IDs

### `/content` — Content Engine
- **Data:** ✅ Now real (fixed this session — was mock)
- **Releases loaded from:** `fetchReleases()` (Supabase)
- **Content items from:** `contentService.getContentItemsWithPosts()`
- **Known stubs:** `zernioAdapter` post/schedule calls → return OK from `zernioService` which is stubbed pending Zernio API credentials
- **Features:** WeeklyContentCalendar, ContentLibrary (own Supabase fetch), ContentPipelineBoard, PostEditor, PostComposerModal, PostModeModal, ContentCreatorPanel

### `/analytics` — Analytics Dashboard
- **Data:** Via `useAnalytics()` → `ANALYTICS_REGISTRY` (provider-agnostic)
- **Status:** All 3 providers (Spotify, Songstats, Soundcharts) are intentional stubs. Each now checks its specific env var and surfaces the exact missing var name in the provider status card. Dashboard renders correctly in stub mode.
- **Raw data fallback:** `raw_analytics/` directory can be loaded by Apple Music provider for date-specific JSON file reads

### `/calendar` — Calendar
- **Data:** Real (Supabase queries to 8 tables: releases, content_items, shows, meetings, todos, goals, tasks, platform_posts)
- **Features:** Month/Week/Day views, recurring event expansion, drag-and-drop (fixed — `task_`/`pp_` ID prefixes now handled correctly), CalendarAIAssistant, CalendarSlotDrawer, CalendarEventModal, CalendarEventDetailModal, CalendarInsightsPanel, assistant command bus subscription

### `/goals` — Goal Tracker
- **Data:** Real (`supabase.from('goals')` in `GoalsTrackerComponent`)
- **Features:** Progress bars with auto/manual/hybrid tracking, inline entry logging, Gemini AI analysis, GoalModal CRUD

### `/strategy` — Career Map
- **Data:** Real (supabase: `goals`, `releases`, `shows`)
- **Computed sections:** Strategy Snapshot, Velocity Indicators, and Needs Attention all derive from live Supabase data. Streaming/social velocity rows explicitly label "No provider connected" when no analytics credentials are set.
- **Empty states:** Needs Attention shows "Everything is on schedule" when no overdue items exist. Milestone timeline shows "No milestones yet" when empty.

### `/network` — Network & Contacts
- **Data:** Real (`supabase.from('opportunities')`)
- **Features:** Contact cards, star rating, status filter, EmailComposerModal (Gemini-drafted emails), add contact inline form

### `/resources` — Brand Vault
- **Data:** Real (SoundCloud OAuth sync, Dropbox folder links from `constants.ts`)
- **SoundCloud sync:** Wired via `useSoundCloud` hook; requires SoundCloud OAuth client ID

### `/coach` — Artist Coach
- **Data:** Real (Gemini `gemini-2.0-flash` AI chat + `bot_resources` from Supabase)
- **Storage:** Chat history in `localStorage`, knowledge base in `bot_resources` table
- **Features:** Tab switcher (Chat / Knowledge), drag-drop file upload to Supabase storage, resource CRUD, clear history

### `/tasks` — Tasks
- **Data:** Real (`fetchTasks()`, `safeProfiles()`)
- **Features:** Full filter set, inline edit via TaskModal, assistant bus subscription (`create_task` action)

### `/hub` — Public Hub
- **Auth:** Public (no auth required)
- **Data:** Static from `publicHubLinks.ts` config
- **Style:** Dark komi-style link-in-bio

### `/collab/:ideaId` — Collab Portal
- **Auth:** Public
- **Data:** Loads idea by `share_slug` or `ideaId` from Supabase

### `/unauthorized` — Login / Unauthorized
- **Data:** Supabase Auth (email/password sign in + sign up)

---

## Completion Pass 2 — Fixes Applied

### 1. Dead Code Removed
- **Deleted:** `src/components/Sidebar.tsx` — confirmed not imported anywhere in active code.
- **Deleted:** `src/config/navigation.ts` — only consumer was `Sidebar.tsx`.
- TypeScript confirmed clean (`tsc --noEmit` → Exit: 0) after both deletions.

---

### 2. Strategy Page — Replaced Hardcoded Fake Data
**Problem:** CareerMap showed three fully synthetic sections:
- "AI Career Projection": hardcoded "500K Monthly Listeners by October 2026"
- "Growth Velocity": hardcoded +12.4% / +8.2% / -2.1%
- "Stale Milestones": hardcoded "Summer Tour Announcement", "Merch Store Launch"

**Fix (complete section rewrite):**
- **Strategy Snapshot** (purple card): release cadence (count of releases in trailing 90 days), goals on-track count + avg progress %, upcoming shows/releases count — all from real Supabase `goals`, `releases`, `shows` data.
- **Velocity Indicators**: `cadenceLabel` derived from recent release count, `overallProgress` averaged from active goals, streaming/social explicitly labelled "No provider connected" when analytics missing.
- **Needs Attention**: computed from overdue goals (`deadline < today && status !== 'completed'`) + stale scheduled releases (past date, still `scheduled` status). Shows "Everything is on schedule ✓" empty state when list is empty.
- All values wrapped in `useMemo` for performance.
- Header tokens updated: `text-slate-900` → `text-text-primary`, `text-slate-500` → `text-text-secondary`.

---

### 3. Calendar — Fixed Drag-and-Drop ID Bug
**Problem:** `handleDrop` in `Calendar.tsx` used prefixed IDs (`task_<uuid>`, `pp_<uuid>`) when querying Supabase but neither stripped the prefix nor mapped to the correct table + field.

**Fix:**
- `task_` prefix: strip, use `tasks` table, update `due_date` field.
- `pp_` prefix: strip, use `platform_posts` table, update `scheduled_at` (preserving existing HH:MM:SS from stored value, only replacing the date component).
- All other event types continue using the existing `tableMap`.

---

### 4. Release Detail — Explicit "Not Linked" States
**Problem:** Apple Music and YouTube streaming cards rendered as opacity-40/50 greyed blocks with no label, appearing visually broken.

**Fix:** Both the `hasStreaming` and no-streaming branches now render a `"Not linked"` sub-label chip beneath the platform name — clear, honest, and consistent with the rest of the UI.

---

### 5. Zernio — Removed Silent Fake Success
**Problem:** `zernioService.ts` had `mockPublishResult()` and `mockScheduleResult()` returning `{ success: true }` when `VITE_ZERNIO_API_KEY` was unset. The app silently pretended all posts were published.

**Fix:**
- Removed `mockPublishResult()` and `mockScheduleResult()` functions entirely.
- Added `notConfiguredResult()` returning `{ success: false, error: 'Publishing integration not configured. Set VITE_ZERNIO_API_KEY...' }`.
- All 6 service methods now call `notConfiguredResult()` when `!hasApiKey()`.
- `cancelPost` returns `false` instead of `true` when unconfigured.
- Added `export const zernioConfigured` boolean function for UI consumption.

---

### 6. PostComposerModal — Zernio Setup Banner
**Problem:** Publish / Schedule buttons were enabled and silent when Zernio was not configured.

**Fix:** Imported `zernioConfigured` from `zernioService`. Added an amber `⚠` warning banner directly above the action buttons when `!zernioConfigured()`:
> *"Publishing integration not configured — Set VITE_ZERNIO_API_KEY to enable external publishing. Local scheduling and drafts work normally."*

---

### 7. Analytics Providers — Env Var Hints
All three analytics providers previously failed silently with a generic error and lowercase display names.

**Fixes applied to `spotifyProvider.ts`, `songstatsProvider.ts`, `soundchartsProvider.ts`:**
- Display names capitalised: `'spotify'` → `'Spotify'`, etc.
- Each now checks its specific env var at startup.
- `errorMessage` field includes the exact env var name needed: `"Set VITE_SPOTIFY_ACCESS_TOKEN to enable Spotify streaming analytics."` — surfaces in `ProviderStatusRow` UI without a debugger.

---

### 8. Env Validation Utility — `src/lib/envConfig.ts` (created)
New central utility for all environment variable access:
- `env` — typed accessors (`env.supabaseUrl`, `env.geminiApiKey`, `env.zernioApiKey`, etc.)
- `features` — boolean flags per integration (`features.zernioPublishing`, `features.spotifyAnalytics`, `features.geminiAI`, …)
- `hasAnyAnalyticsProvider` — convenience boolean (any of Spotify / Songstats / Soundcharts configured)
- `reportEnvReadiness()` — logs missing required vars to console in dev mode only
- `getEnvSummary()` — returns `{ key, label, present, required }[]` for programmatic use

`reportEnvReadiness()` is called in `src/main.tsx` at boot so missing vars surface immediately in the dev console.

---

### 9. GlobalSearch Path Fix
**Problem:** `GlobalSearch.tsx` navigated opportunity results to `/opportunities`, which is not a registered route in `App.tsx` (correct path is `/network`).

**Fix:** Changed `path: '/opportunities'` → `path: '/network'` in the search result mapper.

---

### 10. Design Token Normalisation — Page Headers
Replaced legacy Tailwind hardcoded colours with design system tokens across 5 pages:

| Page | Before | After |
|---|---|---|
| `Calendar.tsx` | `text-slate-900` / `text-slate-500` | `text-text-primary` / `text-text-secondary` |
| `ReleaseTracker.tsx` | `text-slate-900` / `text-slate-500` | `text-text-primary` / `text-text-secondary` |
| `ContentEngine.tsx` | `text-slate-900` | `text-text-primary` |
| `Opportunities.tsx` | `text-slate-900` / `text-slate-500` | `text-text-primary` / `text-text-secondary` |
| `AnalyticsDashboard.tsx` | `text-slate-900` / `text-slate-500` | `text-text-primary` / `text-text-secondary` |

---

## Intentional Stubs (Awaiting Credentials)

| Feature | File | Status |
|---|---|---|
| Spotify Analytics | `src/analytics-collector/platforms/spotify/` | Stub — needs `VITE_SPOTIFY_ACCESS_TOKEN` (shown in provider card when missing) |
| Songstats Analytics | `src/analytics-collector/platforms/songstats/` | Stub — needs `VITE_SONGSTATS_API_KEY` (shown in provider card when missing) |
| Soundcharts Analytics | `src/analytics-collector/platforms/soundcharts/` | Stub — needs `VITE_SOUNDCHARTS_APP_ID` + `VITE_SOUNDCHARTS_APP_SECRET` (shown in provider card when missing) |
| Zernio posting | `src/services/zernioService.ts` | Stub — needs `VITE_ZERNIO_API_KEY` — returns honest error + amber banner in PostComposerModal when unconfigured |
| SoundCloud OAuth | `src/hooks/useSoundCloud.ts` + `server.ts` | Wired — needs `SOUNDCLOUD_CLIENT_ID/SECRET` |
| Spotify OAuth | `server.ts` | Wired — needs `SPOTIFY_CLIENT_ID/SECRET` |
| Gemini AI | `src/services/reportService.ts`, `src/pages/ArtistCoach.tsx` | Wired — needs `VITE_GEMINI_API_KEY` |

---

## Required Env Variables

```env
# Supabase (required)
VITE_SUPABASE_URL=
VITE_SUPABASE_PK=         # anon public key
SUPABASE_SERVICE_ROLE_KEY= # server-side only

# AI
VITE_GEMINI_API_KEY=

# OAuth — server.ts
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SOUNDCLOUD_CLIENT_ID=
SOUNDCLOUD_CLIENT_SECRET=

# Analytics APIs (optional — analytics shows stubs until set)
VITE_SPOTIFY_ACCESS_TOKEN=
VITE_SONGSTATS_API_KEY=
VITE_SOUNDCHARTS_APP_ID=
VITE_SOUNDCHARTS_APP_SECRET=

# Zernio social publishing (optional)
VITE_ZERNIO_API_KEY=
```

---

## Dead Code

> **Resolved in Completion Pass 2.** Both files were deleted and `tsc --noEmit` confirmed 0 errors after removal.

| File | Status |
|---|---|
| `src/components/Sidebar.tsx` | ✅ Deleted — was not imported anywhere in active code |
| `src/config/navigation.ts` | ✅ Deleted — only consumer was `Sidebar.tsx` |

---

## Database Tables Used

| Table | Used by |
|---|---|
| `ideas` | Ideas page, GlobalSearch, useDashboard |
| `idea_assets` | AudioReviewModal, IdeaFormModal |
| `idea_comments` | AudioReviewModal |
| `releases` | ReleaseTracker, ReleaseDetail, Calendar, CareerMap, ContentEngine |
| `tasks` | Tasks, Calendar, useDashboard, MyTasksWidget |
| `goals` | GoalTracker, Calendar, CareerMap, useDashboard |
| `content_items` | ContentEngine, Calendar, GlobalSearch |
| `content_assets` | PostEditor, ContentLibrary |
| `platform_posts` | Calendar, ContentEngine, contentService |
| `shows` | Calendar, CareerMap |
| `meetings` | Calendar |
| `todos` | Calendar, useDashboard |
| `opportunities` | Network page |
| `outreach_emails` | EmailComposerModal |
| `bot_resources` | ArtistCoach knowledge base |
| `profiles` | Tasks (assignee), AuthContext |
| `user_roles` | useCurrentUserRole |
| `sync_jobs` | reportService, IntegrationStatusCard |
| `integrations` | reportService |
| `report_snapshots` | reportService (write-back) |
| `playlist_events` | Future — playlisting intel |
| `competitor_artists` | Future — competitor tracking |
| `audio_jobs` | Future — Auphonic workflow |

---

## Architecture Notes

- **Auth:** Supabase Auth (email/password). `ProtectedRoute` redirects unauthenticated users to `/unauthorized`. `RoleRestrictedRoute` enforces role-level gates.
- **Role system:** `user_roles` table, `UserRoleType = 'artist' | 'manager' | 'viewer'`. `useCurrentUserRole()` derives permissions (`canCreateTrack`, `canEditContent`, etc.).
- **Navigation:** Top navbar (`Layout.tsx`) with dropdown menus. Mobile: hamburger slide-over + bottom tab bar.
- **Animation:** All via `motion/react` (Framer Motion v12 package named `motion`).
- **CSS:** Tailwind v4 with `@theme` tokens. Design system uses `text-text-primary`, `text-text-secondary`, `text-text-tertiary`, `text-text-muted`, `bg-background`, `bg-surface`, `bg-surface-raised`, `border-border`, `text-brand`.
- **Global Assistant:** `AssistantContext` + `GlobalAssistantDrawer` rendered once in `Layout.tsx`. Pages register context via `useAssistantPageContext()`. Cross-page actions dispatched via `commandBus`.
- **Print/PDF:** `@media print` in `index.css` isolates `#wos-report-print` for `WeeklyReportView` export.
- **PWA:** `public/manifest.json` + `public/sw.js` registered in `src/main.tsx`. Redirects handled by `public/_redirects` (Netlify/Vercel).

---

*Audit completed. TypeScript: 0 errors. All pages verified end-to-end.*
