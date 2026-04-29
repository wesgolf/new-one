self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(Promise.resolve());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      await self.clients.claim();
      await self.registration.unregister();
    })(),
  );
});

self.addEventListener('fetch', () => {
  // Intentionally no-op. Existing deployed service workers should tear
  // themselves down on activate so stale app shells stop persisting.
});
