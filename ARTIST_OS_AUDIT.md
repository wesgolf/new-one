# ARTIST OS — Full Codebase Audit
**Date:** 2026-04-16  
**Author:** GitHub Copilot (automated audit)  
**Scope:** `/src`, `server.ts`, `supabase-schema.sql`, `public/`, `index.html`

---

## WORKFLOW CONVENTION (applies to all future phases)

After **every major step** in this plan, the following two gates are mandatory before committing:

### 🔍 Debug Gate
1. Run `npm run dev` — confirm zero runtime errors in the browser console.
2. Navigate to every affected page and confirm it loads without blank screen or unhandled Promise rejection.
3. Check the Network tab for any 4xx/5xx requests that didn't exist before the change.
4. Run `npx tsc --noEmit` — confirm zero TypeScript compiler errors.

### 🔒 Security Gate
1. Verify no new hardcoded secrets, tokens, or passwords were introduced (search: `grep -r "secret\|password\|apikey\|token" --include="*.ts" --include="*.tsx"` and confirm all matches are `import.meta.env` / `process.env` reads).
2. Confirm no raw SQL or user-supplied strings are interpolated into Supabase queries.
3. Confirm any newly exposed route is either passkey-gated or intentionally public (with a comment explaining why).
4. Confirm RLS is commented back in on any new table before making data available beyond the passkey gate.
5. Confirm external API calls use HTTPS and do not leak `Authorization` headers to third-party redirects.

### ✅ Commit Gate
Only after both gates pass:
```bash
git add -A
git commit -m "<phase>: <short description>"
git push origin main
```

---

## 1. App Entry Points

| File | Role |
|---|---|
| `index.html` | HTML shell; registers `sw.js` inline via script tag; intercepts Vite WebSocket errors |
| `src/main.tsx` | React root; wraps `App` in `BrowserRouter` + Sentry `withErrorBoundary`; initialises Sentry if `VITE_SENTRY_DSN` is present |
| `src/App.tsx` | Route tree root; contains `PasskeyGate` component (hardcoded passkey `wesmusic123`) |
| `server.ts` | Express server; handles SoundCloud OAuth proxy, analytics endpoints, serves Vite build in production |

---

## 2. Routing Structure

### App.tsx Route Tree
```
/collab              → CollabPortal (PUBLIC — no passkey)
/* (PasskeyGate)
  <Layout>
    /                → CommandCenter
    /ideas           → Ideas
    /releases        → ReleaseTracker
    /finance         → Finance
    /content         → ContentEngine
    /analytics       → Analytics → AnalyticsDashboard
    /calendar        → Calendar
    /goals           → GoalTracker → GoalsTrackerComponent
    /strategy        → CareerMap
    /network         → Opportunities
    /resources       → BrandVault
    /coach           → ArtistCoach
    /spotify-callback   → SpotifyCallback
    /soundcloud-callback → SoundCloudCallback
    *                → redirect /
```

### Pages NOT wired into App.tsx router (orphaned/unused)
| File | Status |
|---|---|
| `src/pages/Tasks.tsx` | **ORPHANED** — imported nowhere in `App.tsx`; accessed via direct URL only if added to router |
| `src/pages/NotFound.tsx` | **ORPHANED** — not referenced in `App.tsx`; the catch-all redirects to `/` instead |
| `src/pages/Unauthorized.tsx` | **ORPHANED** — `ProtectedRoute` redirects to `/unauthorized` but that route is not registered |
| `src/pages/PublicHub.tsx` | **ORPHANED** — used only inside `Unauthorized.tsx`; not a standalone route |
| `src/pages/ReleaseDetail.tsx` | **ORPHANED** — no `/releases/:releaseId` route registered |
| `src/components/Sidebar.tsx` | **DEAD** — references `navigationRoutes` from `config/navigation.ts` (old route set); never rendered — `Layout.tsx` renders its own inline nav |
| `src/config/navigation.ts` | **DEAD** — defines `/opportunities`, `/shows`, `/links` routes that don't exist in `App.tsx` |

---

## 3. Layout & Navigation

- **Active layout:** `src/components/Layout.tsx` — top nav bar with full link list + hamburger mobile menu. Renders `<Outlet />`.
- **Dual nav definition:** `Layout.tsx` defines `navItems` inline **and** a separate `coreNavItems` array. `coreNavItems` is defined but never used.
- **`Sidebar.tsx`** is a full alternative sidebar component that is **never rendered anywhere**. It references `https://picsum.photos/seed/dj/100/100` as a hardcoded avatar image. Should be removed or repurposed.
- Both `Calendar` icons are used twice in `navItems` (for `Content` at `/content` and `Calendar` at `/calendar`) — icon duplication, not a bug.

---

## 4. Supabase Client Setup

- `src/lib/supabase.ts` — single client export using `VITE_SUPABASE_URL` + `VITE_SUPABASE_PK`.  
- Falls back to `https://placeholder-project.supabase.co` and `placeholder-key` when env vars are missing — **prevents crash on init but all queries silently fail**.
- `VITE_SUPABASE_PK` is a non-standard env var name (conventional is `VITE_SUPABASE_ANON_KEY`); all `.env` docs should use the correct name.
- `src/lib/auth.ts` — full auth utility layer (sign-in, sign-up, sign-out, `getCurrentAuthUser`, profile fetch).
- `src/context/AuthContext.tsx` — `AuthProvider` + `AuthContext` are fully implemented **but never added to `main.tsx`**; neither `ProtectedRoute` nor `RoleRestrictedRoute` are used anywhere in `App.tsx`.
- Current "auth" is the `PasskeyGate` in `App.tsx` (checks `localStorage.getItem('artist_os_authorized') === 'true'`).

**⚠️ Security issue:** The passkey `wesmusic123` is hardcoded in plaintext inside `App.tsx`. It is checked via `===` against a localStorage value, providing trivially bypassed "protection".

---

## 5. Auth / Session Handling

| Layer | State |
|---|---|
| Supabase Auth (`supabase.auth`) | Wired in `auth.ts`, never called from the UI currently |
| `AuthContext` / `AuthProvider` | Built, not mounted — dead code |
| `ProtectedRoute` | Built, not mounted anywhere in router |
| `RoleRestrictedRoute` | Built, not mounted anywhere in router |
| `PasskeyGate` (App.tsx) | **Active gating mechanism** — localStorage flag + hardcoded passkey |
| `useCurrentUser` hook | Reads `AuthContext` — will always return `undefined` since `AuthProvider` is not mounted |
| `useCurrentUserRole` hook | Same — always returns `null` |

---

## 6. Service Worker

- `public/sw.js` — registered inline in `index.html` via `navigator.serviceWorker.register('/sw.js')`.
- **Minimal implementation:** caches only `/`, `/index.html`, `/manifest.json` on install; serves cache-first for all fetches.
- **Problems:**
  - No `activate` handler to clear old caches — stale builds will persist on user devices after deploys.
  - No network-first strategy for API calls (`/api/*`, Supabase, Zernio, Spotify) — if any of these URLs match the cache, they'll return stale data silently.
  - Cache version is `artist-os-v1` — never bumped automatically on deploy.
  - No `fetch` handler filtering — it intercepts ALL requests including Supabase API calls, which should never be cached.

---

## 7. External Integrations

### Spotify (PKCE, client-side)
- `src/lib/spotify.ts` — full PKCE OAuth flow; token stored in `localStorage`.
- Multiple `VITE_SPOTIFY_URI_x` env vars to support multiple redirect URIs.
- Token storage: `localStorage.setItem('spotify_access_token', ...)` — plaintext in browser storage.
- `useSpotify` hook in `src/hooks/useSpotify.ts` — polls `/me` on focus/storage change.
- Used in: `AnalyticsDashboard`, `ReleaseTracker`, `Calendar`, `BrandVault`.
- **Manual "Connect Spotify" button** in multiple pages — should become automated after first connect.

### SoundCloud (PKCE, server-side proxy)
- `src/hooks/useSoundCloud.ts` — PKCE generation in browser; token exchange proxied through `server.ts`.
- `server.ts` routes: `/api/soundcloud/login`, `/api/soundcloud/token`, proxy endpoints `/api/soundcloud/me`, `/api/soundcloud/tracks`.
- `SOUNDCLOUD_REDIRECT_URI` in `server.ts` is **hardcoded** to a Cloud Run URL (`ais-dev-cvasv4enruoz3oi4xjg4rs-486722240196.us-east1.run.app`) — will break on any other deployment.
- Token stored in `localStorage`.
- **Manual "Connect SoundCloud" button** in multiple pages.

### Zernio (content scheduling)
- `src/lib/zernio.ts` + `src/services/zernioService.ts` + `src/content/services/zernioAdapter.ts` — **three separate Zernio abstractions**; duplicated pattern.
- `VITE_ZERNIO_API_KEY` required; falls back to mock mode silently.
- API base: `https://api.zernio.com/v1` in `lib/zernio.ts` vs `https://zernio.com/api/v1` in `services/zernioService.ts` — **inconsistent base URL**.
- Used in: `ContentEngine`, `CommandCenter` (via `zernioAdapter`).
- **Manual "Sync Zernio" button** present; should become a background polling job.

### Gemini AI (AI Coach / Goals)
- `src/services/aiEngine.ts` — uses `process.env.GEMINI_API_KEY`; **wrong for Vite** (should be `import.meta.env.VITE_GEMINI_API_KEY`).
- `src/pages/ArtistCoach.tsx` line 249 — same `process.env.GEMINI_API_KEY` call.
- `src/components/GoalsTrackerComponent.tsx` line 74 — same issue.
- All three will silently fail in the browser because `process.env` is undefined at runtime in a Vite SPA.

### Sentry (error monitoring)
- `src/main.tsx` — initialised with `VITE_SENTRY_DSN`; browser tracing + replay enabled.
- `tracePropagationTargets` includes a hardcoded Cloud Run URL.

### Analytics Collector (`src/analytics-collector/`)
- Node.js browser-based scraper (Playwright/Puppeteer) — **NOT a frontend module**.
- Resides inside `src/` but references `process.env`, SQLite (`src/analytics-collector/storage/db.ts`), and a headless Chromium launcher (`browser/launcher.ts`).
- **These files should not be bundled into the Vite frontend** — they'll cause build errors or silently fail.
- Server-side analytics endpoints in `server.ts` (`/api/analytics/latest`, `/api/analytics/trigger`) read from SQLite DB and serve JSON.

### Songstats / Soundcharts
- `src/services/analytics/songstatsProvider.ts` — stubbed, returns `not_configured`.
- `src/services/analytics/soundchartsProvider.ts` — stubbed similarly.
- `src/services/analytics/spotifyProvider.ts` — stubbed similarly.
- None are called from any component yet.

---

## 8. Dashboard Data Sources (CommandCenter)

The `CommandCenter` page fetches directly via `supabase.from(...)` **without using `supabaseData.ts` helpers**:

| Table | Fetch | Present in schema |
|---|---|---|
| `releases` | `select('*')` | ✅ |
| `content_items` | `select('*')` | ✅ |
| `shows` | `select('*')` | ✅ |
| `meetings` | `select('*')` | ✅ |
| `todos` | `select('*')` | ✅ |
| `goals` | `select('*')` | ✅ |
| `opportunities` | `select('*')` | ✅ |
| Zernio posts | `zernioAdapter.fetchPosts()` | External API |
| Zernio analytics | `zernioAdapter.fetchAnalytics()` | External API |

---

## 9. Calendar Data Sources

| Table | Present in schema |
|---|---|
| `content_items` | ✅ |
| `releases` | ✅ |
| `shows` | ✅ |
| `meetings` | ✅ |
| `todos` | ✅ |
| `goals` | ✅ |
| `platform_posts` | ✅ (schema) — queried at line 144 |

Also calls SoundCloud and Spotify sync manually — loads tracks and inserts them as releases.

---

## 10. Ideas Page Data Sources

- `Ideas.tsx` uses `useArtistData<Release>('releases')` — reads the `releases` table and filters by status `['idea','production','mastered','ready']`.
- **No dedicated `ideas` table** — ideas are releases. `supabaseData.ts` has `fetchIdeas()` which tries `ideas` table then falls back to `releases`.
- `ideas`, `idea_assets`, `idea_comments` tables are referenced in `supabaseData.ts` but **NOT defined in `supabase-schema.sql`**.

---

## 11. Analytics Page Data Sources

- `Analytics.tsx` → `AnalyticsDashboard.tsx`.
- Fetches `/api/analytics/latest` (Express endpoint → SQLite).
- Fetches Spotify via `spotifyFetch('/artists/{id}')` (requires Spotify auth).
- Fetches SoundCloud `/me` (requires SoundCloud auth).
- Uses `useArtistData<Release>('releases')` for SoundCloud stats aggregation.
- **Manual "Sync" button** calls `/api/analytics/trigger` → runs analytics collector.

---

## 12. Tables Queried by the UI

| Table | Queried by |
|---|---|
| `releases` | CommandCenter, ReleaseTracker, Ideas (via `useArtistData`), Finance, Calendar, BrandVault, CareerMap, CollabPortal, AnalyticsDashboard, ContentEngine |
| `content_items` | CommandCenter, ContentEngine, Calendar, Tasks (via service) |
| `todos` | CommandCenter, Calendar, Tasks page |
| `goals` | CommandCenter, GoalTracker, CareerMap, Calendar |
| `shows` | CommandCenter, Calendar, CareerMap |
| `meetings` | CommandCenter, Calendar |
| `opportunities` | CommandCenter, Opportunities page |
| `finance` | Finance page |
| `bot_resources` | ArtistCoach, GlobalSearch |
| `inbox` | QuickCapture component |
| `platform_posts` | Calendar, contentService |
| `publish_logs` | contentService (insert on publish) |
| `content_assets` | contentService (insert on upload) |
| `profiles` | `supabaseData.safeProfiles()`, Tasks page |
| `tasks` | `supabaseData.fetchTasks()`, Tasks page — falls back to `todos` if missing |
| `integration_accounts` | `supabaseData.fetchIntegrations()` |
| `sync_jobs` | `supabaseData.fetchSyncJobs()` |
| `goal_entries` | `supabaseData.fetchGoalEntries()` |
| `ideas` | `supabaseData.fetchIdeas()` — falls back to `releases` |
| `idea_assets` | `supabaseData` — falls back to `[]` |
| `idea_comments` | `supabaseData` — falls back to `[]` |

---

## 13. Tables Missing from Supabase Schema (expected by UI)

| Table | Expected by | Schema status |
|---|---|---|
| `tasks` | `supabaseData.ts`, `Tasks.tsx` | ❌ NOT in `supabase-schema.sql` |
| `ideas` | `supabaseData.fetchIdeas()` | ❌ NOT in `supabase-schema.sql` |
| `idea_assets` | `supabaseData.fetchIdeaAssets()` | ❌ NOT in schema |
| `idea_comments` | `supabaseData.fetchIdeaComments()` | ❌ NOT in schema |
| `goal_entries` | `supabaseData.fetchGoalEntries()` | ❌ NOT in schema |
| `integration_accounts` | `supabaseData.fetchIntegrations()` | ❌ NOT in schema |
| `sync_jobs` | `supabaseData.fetchSyncJobs()` | ❌ NOT in schema |
| `profiles` | `auth.ts`, `supabaseData.safeProfiles()` | ⚠️ in schema but different column set (`user_id` FK vs `id` = auth.uid) |

---

## 14. Pages Querying Broken / Missing Tables

| Page | Table | Impact |
|---|---|---|
| `Tasks.tsx` | `tasks` (missing) | Falls back to reading `todos` via `supabaseData.fetchTasks()`; silently works but data model differs |
| `ArtistCoach.tsx` | `bot_resources` (in schema ✅ but RLS disabled) | Works; no user isolation |
| `GoalTracker` → `GoalsTrackerComponent` | `goals`, `goal_entries` | `goals` exists; `goal_entries` missing — falls back to `[]` |
| `supabaseData.fetchIdeas()` | `ideas` table | Falls back to `releases` — functional but confusing |
| `supabaseData.fetchIntegrations()` | `integration_accounts` | Returns `[]` silently |
| `supabaseData.fetchSyncJobs()` | `sync_jobs` | Returns `[]` silently |

---

## 15. External Image URLs (not stored assets)

| Location | URL | Problem |
|---|---|---|
| `Sidebar.tsx` (dead) | `https://picsum.photos/seed/dj/100/100` | Random placeholder avatar |
| `ReleaseTracker.tsx` L102 | `` `https://picsum.photos/seed/${raw.title}/400/400` `` | Fallback for releases without cover art |
| `ReleaseTracker.tsx` L231 | `` `https://picsum.photos/seed/${track.title}/400/400` `` | SoundCloud sync fallback |
| `ReleaseTracker.tsx` L326 | `` `https://picsum.photos/seed/${track.name}/400/400` `` | Spotify sync fallback |
| `Calendar.tsx` L389 | `https://picsum.photos/...` | SoundCloud sync |
| `Calendar.tsx` L457 | `https://picsum.photos/...` | Spotify sync |
| `BrandVault.tsx` L68 | `https://picsum.photos/...` | SoundCloud sync |

**Fix:** Replace all `picsum.photos` fallbacks with a local SVG placeholder or a Supabase Storage default asset. External image CDNs are a privacy + availability risk.

---

## 16. Routes That Need SPA Fallback Support

For Netlify (or similar SPA CDN deploys), all routes must fall back to `index.html`. Current status:

- `public/_redirects` correctly contains `/* /index.html 200` ✅
- **However**, the following routes are **not registered** in `App.tsx` but users may navigate to them directly:
  - `/unauthorized` — referenced by `ProtectedRoute`/`RoleRestrictedRoute` but not in router
  - `/releases/:releaseId` — `ReleaseDetail` page has no route
  - `/tasks` — `Tasks.tsx` has no route
  - `/hub` — alias for `/` not set (links may use either)

---

## 17. Dead Code / Components to Remove or Simplify

| Item | Verdict |
|---|---|
| `src/components/Sidebar.tsx` | **Remove** — never rendered; duplicate of Layout nav |
| `src/config/navigation.ts` | **Remove** — only used by `Sidebar.tsx`; routes don't exist |
| `src/pages/NotFound.tsx` | **Keep but wire** — register as `*` catch for inner routes |
| `src/pages/Unauthorized.tsx` | **Keep but wire** — register `/unauthorized` route |
| `src/context/AuthContext.tsx` + `AuthProvider` | **Keep but mount** — add `<AuthProvider>` to `main.tsx` |
| `src/components/ProtectedRoute.tsx` | **Keep but use** — apply to guarded routes when Supabase auth replaces passkey |
| `src/analytics-collector/` | **Move out of `src/`** — these are Node/Playwright scripts; should live at project root or `scripts/` |
| `useDashboard.ts` | **Dead** — hook is fully built but never imported by any component |
| `src/hooks/useCurrentUser.ts` | **Partially dead** — depends on `AuthContext` which is not mounted |
| `src/services/analytics/songstatsProvider.ts` | **Stub** — returns empty; note for future integration |
| `src/services/analytics/soundchartsProvider.ts` | **Stub** — same |
| `src/services/analytics/spotifyProvider.ts` | **Stub** — same |
| `src/lib/commandBus.ts` | **Audit needed** — used in `Tasks.tsx` via `subscribeAssistantActions`; verify scope |
| `src/engine/growth.ts` | **Active** — used in `CommandCenter`; keep |
| `src/components/dashboard/` (6 sub-components) | **Built but unused** — `DashCard`, `ActionBar`, `ActiveCampaigns`, `SinceLastLogin`, `TodaysPriorities`, `UpcomingContent` are defined but not rendered in `CommandCenter`; `CommandCenter` builds its own inline UI |

---

## 18. Components That Should Be Role-Gated

| Component | Recommended gate |
|---|---|
| Adding/editing releases | `artist` role only (already enforced in `saveIdea` in `supabaseData.ts` but not in the UI) |
| Finance page | `artist` role only |
| BrandVault sync | `artist` role only |
| AI Coach resource deletion | `artist` role only |
| `Tasks.tsx` — create/delete tasks | `artist` role; managers can view only |
| Wipe data button in `ReleaseTracker` | `artist` role only; extremely destructive |

---

## 19. Manual Controls That Should Become Background Jobs

| Current manual control | Recommended automation |
|---|---|
| "Sync SoundCloud" button (ReleaseTracker, Calendar, BrandVault) | Background job on schedule or post-auth |
| "Sync Spotify" button (ReleaseTracker, Calendar) | Background job on schedule |
| "Sync Zernio" button (ContentEngine) | Polling via `setInterval` with configurable interval — already scaffolded as `SYNC_INTERVAL_MS = 3600000` in `ContentEngine.tsx` but uses manual trigger mode |
| Analytics collector trigger (AnalyticsDashboard → `/api/analytics/trigger`) | Cron job in server, not user-triggered |
| "Unlock Dashboard" passkey gate | Replace with Supabase email auth |

---

## 20. Security Issues (OWASP-aligned)

| Issue | Severity | Location |
|---|---|---|
| Hardcoded passkey `wesmusic123` in source | **HIGH** | `App.tsx` `PasskeyGate` |
| `process.env.GEMINI_API_KEY` exposed to browser bundle | **HIGH** | `aiEngine.ts`, `ArtistCoach.tsx`, `GoalsTrackerComponent.tsx` |
| RLS disabled on all tables ("prototype" comment) | **HIGH** | `supabase-schema.sql` |
| Hardcoded Cloud Run redirect URI | **MEDIUM** | `server.ts` `SOUNDCLOUD_REDIRECT_URI` |
| Spotify + SoundCloud tokens stored in `localStorage` (XSS risk) | **MEDIUM** | `lib/spotify.ts`, `hooks/useSoundCloud.ts` |
| `Sidebar.tsx` loads avatar from external CDN (`picsum.photos`) | **LOW** | `Sidebar.tsx` |
| Multiple `picsum.photos` fallbacks leak track titles to external CDN | **LOW** | `ReleaseTracker.tsx`, `Calendar.tsx`, `BrandVault.tsx` |
| No CSRF or origin check on `server.ts` POST endpoints | **MEDIUM** | `server.ts` all POST routes |
| No rate limiting on `/api/soundcloud/token` (token exchange) | **MEDIUM** | `server.ts` |

---

## 21. Prioritised Implementation Plan

Each phase ends with the **Debug Gate → Security Gate → Commit/Push** workflow defined at the top of this document.

---

### Phase 1 — Fix Critical Bugs & Dead Routes
**Goal:** App navigates cleanly, no broken routes, no orphaned pages.

**Tasks:**
- [ ] Register `/unauthorized`, `/tasks`, `/releases/:releaseId` in `App.tsx` router.
- [ ] Wire `NotFound.tsx` as the `*` catch-all instead of redirecting to `/`.
- [ ] Delete `Sidebar.tsx` and `config/navigation.ts` (confirm zero imports first).
- [ ] Add `/tasks` to `Layout.tsx` nav items.
- [ ] Fix `coreNavItems` — either use it or remove it from `Layout.tsx`.

🔍 **Debug Gate:** Navigate to `/unauthorized`, `/tasks`, `/releases/test-id-404`, confirm correct pages render.  
🔒 **Security Gate:** Confirm no new env vars or token mentions added. Confirm `NotFound` page doesn't expose internal route structure.  
✅ **Commit:** `fix: register orphaned routes and remove dead sidebar`

---

### Phase 2 — Fix Gemini API Key Access
**Goal:** AI features actually work in the browser.

**Tasks:**
- [ ] Replace all `process.env.GEMINI_API_KEY` with `import.meta.env.VITE_GEMINI_API_KEY` in:
  - `src/services/aiEngine.ts`
  - `src/pages/ArtistCoach.tsx`
  - `src/components/GoalsTrackerComponent.tsx`
- [ ] Add `VITE_GEMINI_API_KEY` to `.env.example` (not `.env`).

🔍 **Debug Gate:** Open ArtistCoach, send a message, confirm Gemini responds. Check Network tab — confirm the API key is NOT visible in URLs (it lives in the request header body).  
🔒 **Security Gate:** Confirm `VITE_GEMINI_API_KEY` is only read via `import.meta.env`; confirm it's not logged to the console; confirm it's in `.gitignore` / `.env.local` not committed.  
✅ **Commit:** `fix: use import.meta.env for Gemini API key in browser context`

---

### Phase 3 — Fix Service Worker
**Goal:** Deploys don't leave users on stale builds; API calls are never cached.

**Tasks:**
- [ ] Add `activate` event handler to `sw.js` to delete caches not matching current `CACHE_NAME`.
- [ ] Add network-pass-through for all `https://` API origins (Supabase, Zernio, Spotify, SoundCloud, Gemini).
- [ ] Update `CACHE_NAME` to include a `BUILD_VERSION` injected at deploy time or use `Date.now()` as a hash.

🔍 **Debug Gate:** Hard-reload in Chrome → Application tab → Service Workers: confirm new SW activates and prior cache is cleared. Open Network tab, make a Supabase query, confirm it shows as a real network request, not "(from ServiceWorker)".  
🔒 **Security Gate:** Confirm `Authorization` headers on intercepted requests pass through correctly and are not stripped by the SW fetch handler.  
✅ **Commit:** `fix: service worker — add activate cleanup and exclude API requests from cache`

---

### Phase 4 — Add Missing Schema Tables
**Goal:** `tasks`, `ideas`, `idea_assets`, `idea_comments`, `goal_entries`, `integration_accounts`, `sync_jobs` exist in Supabase.

**Tasks:**
- [ ] Add SQL `CREATE TABLE IF NOT EXISTS` blocks to `supabase-schema.sql` for each missing table.
- [ ] Run updated schema in Supabase SQL editor.
- [ ] Verify `safeSelect` helper gracefully handles empty tables (already does via `isMissingTableError`).
- [ ] Add `tasks` table; `Tasks.tsx` should resolve items from it rather than always falling back to `todos`.

🔍 **Debug Gate:** Open Tasks page, create a task, reload page, confirm task persists. Open Goals tracker, add a goal entry, confirm it saves. Check Supabase dashboard tables list matches schema.  
🔒 **Security Gate:** Confirm RLS policies are drafted (even if commented out for now) for each new table. Confirm `user_id` FK is present on every new table.  
✅ **Commit:** `feat(schema): add missing tables — tasks, ideas, idea_assets, idea_comments, goal_entries, integration_accounts, sync_jobs`

---

### Phase 5 — Replace Passkey Gate with Supabase Auth
**Goal:** Real email/password authentication replaces `localStorage` flag + hardcoded passkey.

**Tasks:**
- [ ] Mount `<AuthProvider>` in `main.tsx` wrapping `App`.
- [ ] Replace `PasskeyGate` in `App.tsx` with `ProtectedRoute` (Supabase session check).
- [ ] Register `/login` route pointing to `Unauthorized.tsx` (which already renders `PublicHub` + auth panel).
- [ ] Remove hardcoded passkey string from `App.tsx`.
- [ ] Update `Layout.tsx` logout button to call `signOut()` from `lib/auth.ts` instead of clearing a localStorage flag.

🔍 **Debug Gate:** Sign in with a test Supabase user → confirm redirect to `/`. Sign out → confirm redirect to `/login`. Attempt to navigate to `/releases` while unauthenticated → confirm redirect to `/login`.  
🔒 **Security Gate:** Confirm passkey string `wesmusic123` does NOT appear anywhere in the codebase (`grep -r "wesmusic123" .`). Confirm `localStorage.setItem('artist_os_authorized', ...)` calls are gone. Confirm session token is managed by Supabase JS client (httpOnly cookie or managed storage) not hand-rolled localStorage.  
✅ **Commit:** `feat(auth): replace passkey gate with Supabase session auth`

---

### Phase 6 — Harden Security (RLS + CORS + Rate Limiting)
**Goal:** Data isolation between users; server endpoints protected.

**Tasks:**
- [ ] Enable RLS on all tables in Supabase (`ALTER TABLE x ENABLE ROW LEVEL SECURITY`).
- [ ] Uncomment and activate the policy blocks in `supabase-schema.sql`.
- [ ] Add CORS origin check to `server.ts` POST routes.
- [ ] Add rate limiting middleware to `/api/soundcloud/token` (e.g. `express-rate-limit`).
- [ ] Replace `picsum.photos` fallbacks with a local SVG or Supabase Storage default asset.
- [ ] Fix `SOUNDCLOUD_REDIRECT_URI` in `server.ts` to be dynamic from `process.env.APP_URL`.

🔍 **Debug Gate:** Log in as User A, create a release. Log in as User B (different account) — confirm User B cannot see User A's releases. Verify `/api/soundcloud/token` returns 429 after rapid successive calls.  
🔒 **Security Gate:** Run full OWASP Top 10 check against the endpoints. Confirm no SQL injection paths (all queries use Supabase JS client parameterised methods). Confirm XSS: all user-provided text is rendered via React JSX (not `dangerouslySetInnerHTML`). Confirm SSRF: no user-supplied URLs are fetched server-side except via whitelisted domains.  
✅ **Commit:** `security: enable RLS, add rate limiting, fix redirect URI, remove external image CDN dependencies`

---

### Phase 7 — Move Analytics Collector Out of `src/`
**Goal:** Node scraper code is not bundled with the Vite frontend.

**Tasks:**
- [ ] Move `src/analytics-collector/` → `scripts/analytics-collector/`.
- [ ] Update `server.ts` imports accordingly.
- [ ] Confirm `vite.config.ts` does not resolve `scripts/` into the bundle.
- [ ] Add `scripts/` to `.gitignore` if the Playwright binaries are large, or document binary requirements.

🔍 **Debug Gate:** Run `npm run build` — confirm no Vite bundling errors. Run `node server.ts` — confirm `/api/analytics/latest` still responds.  
🔒 **Security Gate:** Confirm `process.env` reads in the moved scripts are server-only (`SOUNDCLOUD_*`, `GEMINI_API_KEY`). Confirm no `VITE_*` env vars are referenced from Node scripts.  
✅ **Commit:** `refactor: move analytics-collector scripts out of Vite src tree`

---

### Phase 8 — Automate Manual Sync Controls
**Goal:** Remove manual "Sync" buttons; sync happens automatically.

**Tasks:**
- [ ] `ContentEngine.tsx` — the `SYNC_INTERVAL_MS` constant and `syncZernio` callback are already set up; activate the interval in `useEffect`.
- [ ] `ReleaseTracker` and `Calendar` — convert Spotify/SoundCloud "Sync" buttons to run once on mount (if token exists) behind a loading indicator, no user interaction required.
- [ ] `AnalyticsDashboard` — schedule `/api/analytics/trigger` as a server-side cron job; remove the manual trigger button from the UI.
- [ ] Add last-synced timestamp display so users still have visibility.

🔍 **Debug Gate:** Open ContentEngine — confirm Zernio syncs automatically within 60 s. Reload page after connecting Spotify — confirm tracks appear without pressing "Sync". Check Network tab — confirm no duplicated sync requests.  
🔒 **Security Gate:** Confirm sync jobs don't queue unboundedly (add a running-job check before triggering a new one). Confirm error states show a safe message (not raw API error bodies to the user).  
✅ **Commit:** `feat: automate Spotify, SoundCloud, and Zernio sync — remove manual trigger buttons`

---

## 22. Summary Table

| Category | Count / Status |
|---|---|
| Total source files | 105 |
| Pages in router | 14 routes |
| Orphaned pages (not in router) | 5 (`Tasks`, `NotFound`, `Unauthorized`, `PublicHub`, `ReleaseDetail`) |
| Dead components | 2 (`Sidebar`, dashboard sub-components) |
| Tables in schema | 15 |
| Tables missing from schema | 7 |
| External image CDN refs | 7 (all `picsum.photos`) |
| OWASP security issues | 9 |
| Phases in refactor plan | 8 |
| Commits required | 8 (one per phase) |

---

*TODO: After Phase 5 (Supabase auth), revisit `CollabPortal` — it reads `releases` without auth; ensure public-facing data uses RLS `is_public = true` filter.*  
*TODO: `Unauthorized.tsx` renders `PublicHub` — confirm intended; if `/unauthorized` is a login page, consider splitting into a dedicated `Login.tsx`.*  
*TODO: `src/content/mockData.ts` is imported by `ContentEngine.tsx` as the initial state — replace with live Supabase fetch before launch.*
