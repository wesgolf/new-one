# Stability Fixes — Artist OS

> Completed: 2026-04-16  
> Commit: see git log

---

## 1. Finance Module Removed

**Problem:** `Finance.tsx` page and `FinanceWidget` component queried a `finance` Supabase table that doesn't exist, producing `GET /rest/v1/finance 404` errors on every dashboard load.

**Files deleted:**
- `src/pages/Finance.tsx`
- `src/components/FinanceWidget.tsx`

**References removed:**
- `src/App.tsx` — `import { Finance }` + `<Route path="/finance">`
- `src/components/Layout.tsx` — Finance nav item + `DollarSign` lucide import
- `src/pages/CommandCenter.tsx` — `import { FinanceWidget }` + `<FinanceWidget />`
- `src/types.ts` — `FinanceTransaction` and `FinanceSummary` interfaces

---

## 2. Favicon 404 Fixed

**Problem:** Browser auto-requests `/favicon.ico`; no favicon was present and no `<link rel="icon">` tag in `index.html`, producing a persistent 404.

**Fix:**
- Created `public/favicon.svg` — blue rounded square with "M" lettermark
- Added `<link rel="icon" href="/favicon.svg" type="image/svg+xml" />` to `index.html`
- Updated page title from `"My Google AI Studio App"` → `"Muse — Artist OS"`

---

## 3. Service Worker Fixed

**Problem (3 bugs):**
1. **No `activate` handler** — old `artist-os-v1` caches persisted after deploys, serving stale JS/CSS
2. **No API passthrough** — all cross-origin fetch calls (Supabase, Spotify, SoundCloud, Zernio, Gemini) were intercepted by the SW, causing silent network failures
3. **No error handling** — fetch handler had no `try/catch`, causing unhandled promise rejections on cache misses

**Fix (`public/sw.js`):**
- Bumped cache name to `artist-os-v2`
- Added `skipWaiting()` in `install` so new SW activates immediately
- Added `activate` handler that deletes all caches not matching `artist-os-v2` and calls `clients.claim()`
- Added passthrough for all cross-origin requests (`url.origin !== self.location.origin`)
- Added passthrough for `/api/*` routes (never cache server-side responses)
- SPA navigation requests (`event.request.mode === 'navigate'`) served from cached `index.html`
- Added `try/catch` in static asset fetch handler with offline HTML fallback

---

## 4. Analytics HTML-as-JSON Error Fixed

**Problem:** On Netlify static deploys, `fetch('/api/analytics/latest')` and `fetch('/api/analytics/trigger')` return Netlify's HTML 404 page. `response.json()` then threw `Unexpected token '<'`, crashing the analytics dashboard.

**Fix (`src/components/AnalyticsDashboard.tsx`):**
- Added `response.ok` and `content-type: application/json` guard before `.json()` on both fetch calls
- When analytics backend is unavailable, the component silently skips server metrics and continues with client-side data (Spotify, SoundCloud)
- Manual sync button now shows a meaningful error: `"Analytics sync is not available in this environment"`

---

## 5. SoundCloud Artwork Fallbacks Fixed

**Problem:**
- `i1.sndcdn.com` artwork URLs intermittently fail due to SSL certificate issues, producing broken images
- All data normalization fallbacks used `picsum.photos` (external dependency, adds latency, inappropriate placeholder)

**Fix:**
- Created `public/placeholder-cover.svg` — indigo disc/play icon
- Replaced all 6 `picsum.photos` fallbacks in data normalization with `/placeholder-cover.svg`:
  - `src/pages/ReleaseTracker.tsx` (lines 102, 231, 326)
  - `src/pages/Calendar.tsx` (lines 389, 457)
  - `src/pages/BrandVault.tsx` (line 68)
- Added `onError={(e) => { e.currentTarget.src = '/placeholder-cover.svg'; }}` to `<img>` elements that render remote artwork:
  - `src/components/TrackFocusCard.tsx`
  - `src/components/ReleasePreviewModal.tsx`
  - `src/pages/ReleaseTracker.tsx` (release card)

---

## 6. Page-Level Error Boundaries Added

**Problem:** A crash in one page (e.g. Calendar or CommandCenter) propagated to the entire app, showing a blank white screen with no recovery option.

**Fix (`src/App.tsx`):**
- Imported the existing `ErrorBoundary` class component from `src/components/ErrorBoundary.tsx`
- Wrapped all 11 page routes individually in `<ErrorBoundary>`:
  - CommandCenter, Ideas, ReleaseTracker, ContentEngine, Analytics, Calendar, GoalTracker, CareerMap, Opportunities, BrandVault, ArtistCoach
- Callback routes (`/spotify-callback`, `/soundcloud-callback`) left unwrapped to avoid masking OAuth errors

---

## Security Notes

- No new secrets introduced
- No user input fed to dynamic queries
- `referrerPolicy="no-referrer"` already present on remote img tags — preserved
- Service worker no longer proxies cross-origin requests — eliminates SSRF surface area in SW scope
- `onError` handlers only set `src` to a local static path — no user-controlled data used
- **Fixed:** `process.env.GEMINI_API_KEY` → `import.meta.env.VITE_GEMINI_API_KEY` in `GoalsTrackerComponent.tsx`, `ArtistCoach.tsx`, and `services/aiEngine.ts` — previously this was always `undefined` in the Vite browser bundle, silently breaking all AI features

---

## Debug Gate Results

```
npx tsc --noEmit → 0 errors
grep -r "finance|Finance|FinanceWidget" src/ → 0 matches
grep -r "picsum.photos" src/ → 0 matches
```
