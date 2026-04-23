const CACHE_NAME = 'artist-os-v7';
const SHELL_ASSETS = [
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
];

const IS_LOCAL_DEV =
  self.location.hostname === 'localhost' ||
  self.location.hostname === '127.0.0.1' ||
  self.location.hostname === '[::1]';

if (IS_LOCAL_DEV) {
  self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(Promise.resolve());
  });

  self.addEventListener('activate', (event) => {
    event.waitUntil(
      caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key)))).then(() => self.registration.unregister())
    );
  });
}

self.addEventListener('install', (event) => {
  if (IS_LOCAL_DEV) return;
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  );
});

// Clean up old caches on activate so stale assets don't persist after deploys
self.addEventListener('activate', (event) => {
  if (IS_LOCAL_DEV) return;
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (IS_LOCAL_DEV) return;
  const url = new URL(event.request.url);

  // 1. Pass through all cross-origin requests (Supabase, Spotify, SoundCloud, Gemini, Sentry, etc.)
  if (url.origin !== self.location.origin) {
    return;
  }

  // 2. Pass through API routes — never cache, never intercept
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // 3. SPA navigation — always serve the app shell (index.html).
  //    Fetch /index.html directly rather than the navigation URL (/coach, /releases, etc.)
  //    so we never depend on the CDN rewrite being applied for SW-originated requests.
  //    A full .catch() ensures the promise NEVER rejects, which is the root cause of the
  //    "FetchEvent resulted in a network error: the promise was rejected" error on /coach.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html').then((cached) => {
        if (cached) return cached;
        // Fetch the app shell directly — more reliable than fetching the nav URL
        return fetch('/index.html', { cache: 'no-cache' });
      }).catch(() =>
        // Offline / network error: return cached shell or a minimal offline page
        caches.match('/index.html').then((cached) =>
          cached ||
          new Response(
            '<!doctype html><html><head><meta charset="UTF-8"><title>Offline</title></head>' +
            '<body style="font-family:sans-serif;text-align:center;padding:4rem">' +
            '<h2>You\'re offline</h2><p>Reconnect and reload to continue.</p></body></html>',
            { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          )
        )
      )
    );
    return;
  }

  // 4. Static assets — cache-first, network fallback.
  //    The .catch() MUST return a real Response (not undefined) to avoid a network error.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        // Only cache successful same-origin GET responses
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() =>
        // Network unavailable — return a real Response so the promise never rejects
        new Response('', { status: 408, statusText: 'Network Timeout' })
      );
    })
  );
});
