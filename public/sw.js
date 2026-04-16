const CACHE_NAME = 'artist-os-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  // Take over immediately so updated SW activates without needing tab close
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('activate', (event) => {
  // Claim all open tabs so the new SW takes effect right away
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip caching entirely for dev server requests (localhost / Vite HMR / API calls)
  const url = new URL(event.request.url);
  const isDevOrigin = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  if (
    isDevOrigin ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/@') ||
    event.request.headers.get('range')
  ) {
    return; // Let the browser handle it normally — no SW interception
  }

  event.respondWith((async () => {
    try {
      if (event.request.mode === 'navigate') {
        const networkResponse = await fetch(event.request);
        const cache = await caches.open(CACHE_NAME);
        cache.put('/index.html', networkResponse.clone());
        return networkResponse;
      }

      const cached = await caches.match(event.request);
      if (cached) return cached;
      return await fetch(event.request);
    } catch (err) {
      try {
        if (event.request.mode === 'navigate') {
          const cachedIndex = await caches.match('/index.html');
          if (cachedIndex) return cachedIndex;
        }
        return new Response('Service unavailable', { status: 503, statusText: 'Service Unavailable' });
      } catch (e) {
        return Response.error();
      }
    }
  })());
});
