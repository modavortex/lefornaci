/* Service worker Le Fornaci — versione 20261126-49768. Pagine: prima la rete, poi la copia salvata. File: copia salvata aggiornata in background. */
var V = 'lf-20261126-49768', CORE = ["./", "club/", "gift-card/", "negozi/", "eventi/", "assets/css/site.css", "assets/js/site.js", "assets/js/demo.js", "assets/js/pwa.js", "assets/js/club.js", "assets/js/club-page.js", "assets/js/gift.js", "assets/js/vendor/qrcode.js", "assets/js/dati.js", "assets/js/mappa.js", "assets/img/logo-lefornaci.png", "assets/img/loghi.webp", "assets/img/app/icon-192.png"];
self.addEventListener('install', function (e) { e.waitUntil(caches.open(V).then(function (c) { return c.addAll(CORE.map(function (u) { return new Request(u, { cache: 'reload' }); })).catch(function () {}); }).then(function () { return self.skipWaiting(); })); });
self.addEventListener('activate', function (e) { e.waitUntil(caches.keys().then(function (k) { return Promise.all(k.filter(function (x) { return x !== V; }).map(function (x) { return caches.delete(x); })); }).then(function () { return self.clients.claim(); })); });
self.addEventListener('fetch', function (e) {
  var r = e.request; if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  if (r.mode === 'navigate') {
    e.respondWith(fetch(r).then(function (res) { var cp = res.clone(); caches.open(V).then(function (c) { c.put(r, cp); }); return res; })
      .catch(function () { return caches.match(r).then(function (m) { return m || caches.match('club/'); }); }));
    return;
  }
  e.respondWith(caches.match(r).then(function (m) {
    var net = fetch(r).then(function (res) { if (res.ok) { var cp = res.clone(); caches.open(V).then(function (c) { c.put(r, cp); }); } return res; }).catch(function () { return m; });
    return m || net;
  }));
});
