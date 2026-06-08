const CACHE_NAME = 'chessup-v6';
const ASSETS = [
  './',
  'index.html',
  'styles.css',
  'app.js',
  'chess.js',
  'lessons.js',
  'icon.png',
  'manifest.json'
];

// Install: cache shell, immediately take over
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// Activate: nuke old caches, take control of all clients immediately
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then((clients) => {
        clients.forEach((client) => client.postMessage({ type: 'SW_UPDATED', version: CACHE_NAME }));
      })
  );
});

// Fetch: network-first for EVERYTHING — guarantees fresh updates.
// Falls back to cache when offline. Cache is refreshed on every success.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // skip CDN/external

  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((cached) => cached || caches.match('index.html')))
  );
});

// Allow page to trigger immediate update
self.addEventListener('message', (e) => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});
