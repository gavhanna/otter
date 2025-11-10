/* Minimal PWA service worker for Otter */
const CACHE_NAME = 'otter-pwa-v1';
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.webmanifest',
  '/icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(CORE_ASSETS);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Handle navigation requests with a network-first strategy + offline fallback
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          return fresh;
        } catch {
          const cache = await caches.open(CACHE_NAME);
          const offline = await cache.match('/offline.html');
          return offline || Response.error();
        }
      })()
    );
    return;
  }

  // For same-origin GET requests, try cache first, then network
  if (req.method === 'GET' && url.origin === self.location.origin) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(req);
        if (cached) return cached;
        try {
          const res = await fetch(req);
          cache.put(req, res.clone());
          return res;
        } catch {
          // Fallback to offline page for documents if nothing cached
          if (req.destination === 'document') {
            const offline = await cache.match('/offline.html');
            if (offline) return offline;
          }
          return Response.error();
        }
      })()
    );
  }
});

