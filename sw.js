/* Service worker: after the first visit the game loads from the player's own cache,
   so repeat plays cost the host (almost) nothing. The build script stamps the version + asset list. */
const VERSION = 'dev';
const ASSETS = ['./'];
const HASHED = false; // true in the production build: assets have content-hashed names
const CACHE = 'cjm-' + VERSION;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('cjm-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const put = (req, res) => { if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return res; };

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (/google-analytics|googletagmanager|analytics\.google/.test(url.hostname)) return; // never cache analytics

  // the page itself: network first, so new versions ship immediately; cache is the offline fallback
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((r) => put(req, r)).catch(() => caches.match(req).then((r) => r || caches.match('./'))));
    return;
  }
  const sameOrigin = url.origin === self.location.origin;
  const fonts = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!sameOrigin && !fonts) return;

  if ((HASHED && sameOrigin) || fonts) {
    // immutable files: cache first
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => put(req, r))));
  } else {
    // un-hashed dev files: serve cache instantly, refresh in the background
    e.respondWith(caches.match(req).then((hit) => {
      const net = fetch(req).then((r) => put(req, r)).catch(() => hit);
      return hit || net;
    }));
  }
});
