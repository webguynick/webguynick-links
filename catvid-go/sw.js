/* ==========================================================================
   CatVid GO — service worker
   Cache-first app shell so the game installs as a PWA and plays offline.
   Bump CACHE_VERSION whenever you change game files.
   ========================================================================== */

const CACHE_VERSION = 'catvidgo-v2';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/config.js',
  './js/state.js',
  './js/audio.js',
  './js/catsvg.js',
  './js/assets.js',
  './js/map.js',
  './js/encounter.js',
  './js/ui.js',
  './js/main.js',
  './assets/icon-192.png',
  './assets/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Cache-first, then network; successful GETs (e.g. real cat art you add
   later) are cached on the fly so they also work offline next time. */
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((hit) => {
      if (hit) return hit;
      return fetch(e.request).then((res) => {
        if (res.ok && e.request.url.startsWith(self.location.origin)) {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(e.request, copy));
        }
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
