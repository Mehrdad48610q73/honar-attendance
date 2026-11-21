var CACHE = 'honar-attendance-v1';
var ASSETS = [
  './',
  'index.html',
  'manifest.json',
  'icon-192.png',
  'icon-512.png',
  'css/base.css',
  'css/components.css',
  'css/pages.css',
  'js/ui.js',
  'js/jalali.js',
  'js/db.js',
  'js/app.js',
  'js/students.js',
  'js/attendance.js',
  'js/sport.js',
  'js/staff.js',
  'js/calendar.js',
  'js/reports.js',
  'js/backup.js'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return Promise.all(ASSETS.map(function (u) {
        return cache.add(u).catch(function () {});
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

function fromCache(req) {
  return caches.match(req, { ignoreSearch: true }).then(function (r) {
    if (r) return r;
    if (req.mode === 'navigate') return caches.match('index.html');
    return undefined;
  });
}

function networkFirst(req) {
  return new Promise(function (resolve) {
    var settled = false;
    function finish(res) {
      if (settled) return;
      settled = true;
      resolve(res || Response.error());
    }
    var timer = setTimeout(function () {
      fromCache(req).then(function (r) { if (r) finish(r); });
    }, 3500);
    fetch(req).then(function (res) {
      clearTimeout(timer);
      if (res && res.ok && res.type === 'basic') {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
      }
      finish(res);
    }).catch(function () {
      clearTimeout(timer);
      fromCache(req).then(function (r) { finish(r); });
    });
  });
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  e.respondWith(networkFirst(req));
});
