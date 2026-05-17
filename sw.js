/* SLOW FIRE Service Worker — Offline-first cache */
const CACHE = 'slowfire-v1-20260517';
const PRECACHE = [
  '/slow-fire-shop/',
  '/slow-fire-shop/manifest.json',
  '/slow-fire-shop/style.css?v=20260517',
  '/slow-fire-shop/assets/global-search.css?v=20260516',
  '/slow-fire-shop/assets/sf-features.css?v=20260517',
  '/slow-fire-shop/assets/global-search.js?v=20260516',
  '/slow-fire-shop/assets/sf-features.js?v=20260517',
  '/slow-fire-shop/search-index.json',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // Cache strategy: network-first for HTML, cache-first for static assets
  const isAsset = /\.(css|js|json|woff2?|jpg|jpeg|png|webp|svg|gif)(\?.*)?$/.test(req.url);
  if (isAsset) {
    e.respondWith(
      caches.match(req).then(cached => cached || fetch(req).then(r => {
        if (r.ok && new URL(req.url).origin === location.origin) {
          const clone = r.clone();
          caches.open(CACHE).then(c => c.put(req, clone));
        }
        return r;
      }).catch(() => caches.match('/slow-fire-shop/')))
    );
  } else {
    e.respondWith(
      fetch(req).then(r => {
        if (r.ok && new URL(req.url).origin === location.origin) {
          const clone = r.clone();
          caches.open(CACHE).then(c => c.put(req, clone));
        }
        return r;
      }).catch(() => caches.match(req).then(c => c || caches.match('/slow-fire-shop/')))
    );
  }
});
