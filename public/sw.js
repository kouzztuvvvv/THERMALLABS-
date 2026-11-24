const CACHE_NAME = 'uhi-india-atlas-v3';
const TILE_CACHE_NAME = 'uhi-india-tiles-v3';
const API_CACHE_NAME = 'uhi-india-api-v3';

const APP_SHELL_ASSETS = ['/', '/index.html', '/src/main.tsx'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL_ASSETS).catch(() => undefined))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  const validCaches = new Set([CACHE_NAME, TILE_CACHE_NAME, API_CACHE_NAME]);
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !validCaches.has(key))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // 1. Map tiles: Cache-first with background refresh
  if (url.pathname.startsWith('/api/tiles/')) {
    event.respondWith(
      caches.open(TILE_CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) {
          fetch(request)
            .then((fresh) => {
              if (fresh && fresh.ok) cache.put(request, fresh.clone());
            })
            .catch(() => undefined);
          return cached;
        }
        try {
          const networkResp = await fetch(request);
          if (networkResp && networkResp.ok) {
            cache.put(request, networkResp.clone());
          }
          return networkResp;
        } catch {
          return new Response('', { status: 504, statusText: 'Tile offline' });
        }
      })
    );
    return;
  }

  // 2. Open-Meteo environment & geocode endpoints: Network-first with cached JSON fallback
  if (
    url.pathname.startsWith('/api/environment') ||
    url.pathname.startsWith('/api/geocode')
  ) {
    event.respondWith(
      caches.open(API_CACHE_NAME).then(async (cache) => {
        try {
          const networkResp = await fetch(request);
          if (networkResp && networkResp.ok) {
            cache.put(request, networkResp.clone());
          }
          return networkResp;
        } catch {
          const cached = await cache.match(request);
          if (cached) return cached;
          return new Response(JSON.stringify({ offline: true }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      })
    );
    return;
  }

  // Ignore non-cacheable API routes (e.g., /api/chat, /api/health)
  if (url.pathname.startsWith('/api/')) return;

  // 3. App navigation (HTML shell): Network-first with cached fallback
  if (request.mode === 'navigate' || url.pathname === '/' || url.pathname === '/index.html') {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        try {
          const networkResp = await fetch(request);
          if (networkResp && networkResp.ok) {
            cache.put(request, networkResp.clone());
          }
          return networkResp;
        } catch {
          return (
            (await cache.match(request)) ||
            (await cache.match('/index.html')) ||
            (await cache.match('/')) ||
            new Response('Offline', { status: 503 })
          );
        }
      })
    );
    return;
  }

  // 4. All app scripts, Vite dev modules (/@vite/*, /src/*, /node_modules/*), CSS, fonts, icons
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        const networkResp = await fetch(request);
        if (networkResp && networkResp.ok) {
          cache.put(request, networkResp.clone());
        }
        return networkResp;
      } catch {
        const cached = await cache.match(request);
        return cached || new Response('', { status: 504 });
      }
    })
  );
});
