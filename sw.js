// Offline cache for Helo Sweep Width. Bump VERSION whenever you change any file
// so everyone's phone picks up the new copy.
const VERSION = "sweep-v2";
const FILES = [
  "./", "index.html", "map.html", "map.css", "map.js", "calc.js", "leeway.js", "config.js",
  "vendor/leaflet.esm.js", "vendor/leaflet.css",
  "manifest.webmanifest", "icon-180.png", "icon-192.png", "icon-512.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
// Only this site's own files are cached. Forecast data and map tiles always come live from the network,
// so the map never shows an old forecast as if it were current.
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request).then(r => {
      if (r.ok) { const copy = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); }
      return r;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match("index.html")))
  );
});
