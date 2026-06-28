/* ============================================================
   Service worker — same-origin offline cache for the Career
   Team site. CSP-safe: never touches any third-party origin.
   Strategy: stale-while-revalidate for same-origin GETs, so
   the app shell + Pomodoro / Study Plan work fully offline
   once the site has been opened (or installed) online.
   Bump CACHE to invalidate everything.
   ============================================================ */
var CACHE = 'clp-cache-v7';

/* Core app shell precached on install so the key pages work
   offline on first launch after "Add to Home Screen". */
var CORE = [
  './',
  './index.html',
  './faq.html',
  './parents.html',
  './pathways.html',
  './useful-links.html',
  './career-quiz.html',
  './sitemap.html',
  './pomodoro.html',
  './study-plan.html',
  './styles.css?v=23',
  './tools-data.js?v=4',
  './footer-tools.js?v=2',
  './back-to-top.js?v=1',
  './site-nav.js?v=1',
  './site-header.js?v=1',
  './app.js?v=23',
  './posts.js?v=7',
  './pomodoro.js?v=13',
  './study-plan.js?v=13',
  './pathways.js?v=6',
  './useful-links.js?v=6',
  './career-quiz.js?v=6',
  './sitemap.js?v=7',
  './faq.js?v=5',
  './parents.js?v=5',
  './fonts/fonts.css',
  './fonts/notosanstc.css',
  './images/logo.jpg?v=2',
  './images/sprig.svg',
  './images/leaf.svg',
  './images/header-bg.svg',
  './images/icon-192.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      // add individually so one missing file doesn't abort the whole install
      return Promise.allSettled(CORE.map(function (u) { return c.add(u); }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { if (k !== CACHE) return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;          // same-origin only
  if (url.pathname.indexOf('programmes.enc.json') !== -1) return; // let gated data go straight to network

  e.respondWith(
    caches.match(req).then(function (hit) {
      var fromNet = fetch(req).then(function (res) {
        if (res && res.status === 200 && res.type === 'basic') {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () { return hit; });
      return hit || fromNet;            // cache-first, refresh in background
    })
  );
});
