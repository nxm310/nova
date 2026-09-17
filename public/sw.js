// Nova — Compagnon Star Citizen PWA Service Worker
const CACHE_NAME = 'nova-pwa-v1.3.5';

const STATIC_ASSETS = [
  './',
  'manifest.json',
  'favicon.ico',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-192-maskable.png',
  'icons/icon-512-maskable.png',
  'icons/icon-192.svg',
  'icons/icon-512.svg'
];

// Install event: cache basic app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[Nova SW] Failed to precache some assets:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate event: cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event: Network-first with cache fallback
// Critical: Always bypass API, Telemetry, and WebSocket requests
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Do not intercept non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Bypass API, telemetry, audio streams, and WebSockets
  if (
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/telemetry') ||
    url.pathname.startsWith('/ws') ||
    url.protocol === 'ws:' ||
    url.protocol === 'wss:'
  ) {
    return;
  }

  // Network-first strategy for dynamic & fresh static content
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        // Only cache valid basic responses for static files
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          networkResponse.type === 'basic'
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Fallback to cache if network is offline
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // If navigation request failed, try to serve root
          if (request.mode === 'navigate') {
            return caches.match('./') || caches.match('/nova/');
          }
        });
      })
  );
});
