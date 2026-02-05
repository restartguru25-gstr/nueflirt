/* Minimal service worker for PWA offline caching of Legacy and Vibes routes */
const CACHE_NAME = 'nueflirt-v3';
const ROUTES_TO_CACHE = ['/legacy', '/vibes', '/dashboard', '/profile', '/matches', '/library'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ROUTES_TO_CACHE.map((path) => path));
    }).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.pathname !== '/legacy' && url.pathname !== '/vibes' && url.pathname !== '/dashboard' && url.pathname !== '/profile' && url.pathname !== '/matches' && url.pathname !== '/library') return;
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((res) => {
      const clone = res.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
      return res;
    }))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))));
  self.clients.claim();
});
