const CACHE_NAME = 'artist-os-v4';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// Clean up old caches on activate so stale assets don't persist after deploys
self.addEventListener('activate', (event) => {
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
  const url = new URL(event.request.url);

  // Pass through all cross-origin requests (Supabase, Spotify, SoundCloud, Zernio, Gemini, Sentry)
  if (url.origin !== self.location.origin) {
    return;
  }

  // Pass through API routes — never cache these
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // For same-origin navigation requests fall back to /index.html (SPA routing)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html').then((cached) => cached || fetch(event.request))
    );
    return;
  }

  // Cache-first for static assets, network fallback
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
      }).catch(() => {
        // Network unavailable — for HTML navigation return app shell
        if (event.request.headers.get('Accept')?.includes('text/html')) {
          return caches.match('/index.html');
        }
      });
    })
  );
});
