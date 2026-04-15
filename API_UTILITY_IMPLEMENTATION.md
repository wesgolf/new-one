# API Fetch Utility Layer Implementation

## Overview

Implemented a shared API/fetch utility layer for the Artist OS app to prevent fragile network handling across pages. This prevents issues like parsing Netlify HTML fallback pages as JSON and provides structured error information for debugging.

## What Was Created

### 1. **Custom Error Classes** (`src/lib/api/errors.ts`)

Three structured error types for different failure modes:

- **`ApiHttpError`**: HTTP status errors (non-2xx). Includes URL, status, statusText, and response body snippet for debugging.
- **`ApiContentTypeError`**: Content-Type validation failures. Includes URL, expected content-type, actual content-type, and response body snippet.
- **`ApiNetworkError`**: Network-level failures (fetch failed, abort, TypeError). Wraps original error.

All errors include:
- Request URL for debugging
- Response body snippet (first 200 chars) to identify HTML vs JSON issues
- Type guard function `isApiError()` for runtime checking

**Why this matters**: When analytics returns HTML instead of JSON, you now get `ApiContentTypeError` with the actual response body visible in the error message.

### 2. **Typed Fetch Utility** (`src/lib/api/fetchJson.ts`)

Main function: `fetchJson<T>(url, options)` with built-in validation:

```typescript
// Validates automatically:
- response.ok (HTTP 2xx check)
- Content-Type header includes 'application/json'
- JSON parsing safety
- Network errors and aborts
```

Features:
- Generic type support: `fetchJson<Metrics[]>('/api/analytics/latest')`
- Abort signal support for cancellation
- Custom status validators: `validateStatus: (status) => status >= 200 && status < 300`
- Automatically sets `Content-Type: application/json` header

Also includes `createApiFetcher()` for creating bound API clients with default headers/baseUrl.

**Why this matters**: No more silent JSON parse failures. Every fetch is validated before parsing, and errors include debugging info.

### 3. **Error Boundary Component** (`src/components/ErrorBoundary.tsx`)

React error boundary for graceful UI degradation:

- Catches errors in child tree
- Displays user-friendly error UI with debugging tips
- Shows response body snippet for API errors
- Provides "Try Again" button to retry after fixing issues
- Optional custom fallback UI

**Why this matters**: Pages that crash now show a helpful error screen instead of a blank page or console error.

### 4. **Public API Module** (`src/lib/api/index.ts`)

Barrel export for easy importing:

```typescript
import { fetchJson, isApiError, ApiHttpError } from '../lib/api';
```

## Changes to Existing Code

### AnalyticsDashboard (`src/components/AnalyticsDashboard.tsx`)

**Before:**
```typescript
const response = await fetch('/api/analytics/latest');
const data = await response.json();  // ❌ Could parse HTML as JSON silently
```

**After:**
```typescript
const data = await fetchJson<Metric[]>('/api/analytics/latest');
// ✅ Validates content-type, throws structured error if HTML
```

Error handling improved:
- Detects HTML responses: `if (responseBody.includes('<!DOCTYPE'))`
- Distinguishes 404 from other errors
- Shows specific error messages for debugging

Both `fetchMetrics()` and `handleManualSync()` refactored to use `fetchJson()`.

### App.tsx Routes

Added error boundary wrappers around high-risk pages:
- `/analytics` - prone to fetch failures
- `/ideas` - has service worker issues
- `/releases` - queries Supabase data
- `/calendar` - combines multiple data sources
- `/goals` - data-heavy

Wrapped entire app in top-level ErrorBoundary for safety.

## Usage Examples

### Safe JSON fetching in new code:

```typescript
import { fetchJson, isApiError } from '../lib/api';

try {
  const data = await fetchJson<MyType>('/api/endpoint');
  // data is typed as MyType
} catch (err) {
  if (isApiError(err)) {
    console.error(`Failed to fetch: ${err.message}`);
    // err.url, err.responseBody available for debugging
  }
}
```

### With abort signal (for cleanup):

```typescript
const controller = new AbortController();

const data = await fetchJson<MyType>('/api/endpoint', {
  signal: controller.signal
});

// Later: controller.abort();
```

### Creating a bound API client:

```typescript
const analyticsApi = createApiFetcher('/api/analytics');

// Both equivalent:
const data1 = await analyticsApi<Metrics>('/latest');
const data2 = await fetchJson<Metrics>('/api/analytics/latest');
```

### In components with error boundary:

```typescript
<ErrorBoundary resetKeys={[userId]}>
  <YourPageComponent userId={userId} />
</ErrorBoundary>

// Resets error boundary when userId changes
```

## Benefits

1. **Prevents Silent Failures**: All fetch errors are caught and provide debugging info
2. **HTML-as-JSON Detection**: Automatically identifies when endpoints return error pages
3. **Typed Responses**: Generic support means response data is properly typed
4. **Graceful Degradation**: Pages show error UI instead of crashing
5. **Standardized Error Objects**: All API code follows same error format
6. **Debuggability**: Response body snippets help identify issues quickly
7. **No More Unhandled Rejections**: Error boundaries catch promise rejections

## Next Steps for Stability Pass

To finish the stability pass, apply this pattern to:

1. **Calendar.tsx** - Wraps Supabase queries
2. **ReleaseTracker.tsx** - Multiple data sources
3. **Ideas.tsx** - Service worker integration issues
4. **CommandCenter.tsx** - Large data orchestration
5. **Other pages** - Any with external API calls

Can be done incrementally without breaking existing functionality.

## Testing

To test the error handling:

1. **Block network**: DevTools Network tab → Offline mode
   - Should show "Network error while fetching" message

2. **Mock broken analytics endpoint**:
   - Modify `/api/analytics/latest` to return HTML
   - Should show content-type error with HTML snippet

3. **Break JSON response**:
   - Modify endpoint to return invalid JSON
   - Should show parsing error

4. **404 endpoint**:
   - Request non-existent endpoint
   - Should show "404 from URL" error

---

**Implementation Status**: ✅ Complete
- All files compile without errors
- Ready for testing and rollout to other pages
