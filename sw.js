// Service Worker — Birthday Album App
var CACHE = "birthday-v2";
var BASE = self.location.pathname.replace(/\/sw\.js$/, "");

var ASSETS = [
  BASE + "/",
  BASE + "/index.html",
  BASE + "/upload.html",
  BASE + "/css/style.css",
  BASE + "/js/main.js",
  BASE + "/js/upload.js",
  BASE + "/js/supabase.js",
  BASE + "/icons/icon-192.png",
  BASE + "/icons/icon-512.png",
  BASE + "/manifest.json"
];

// Install — pre-cache all static assets
self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(ASSETS).catch(function () {
        // Continue even if some assets fail to cache
      });
    })
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE; })
            .map(function (k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// Fetch — cache-first for static assets, pass through for API calls
self.addEventListener("fetch", function (e) {
  var url = e.request.url;

  // Never cache Supabase API calls
  if (url.includes("supabase.co")) return;

  // Never cache dev tooling
  if (url.includes("browser-sync") || url.includes("__webpack")) return;

  // Only handle GET requests
  if (e.request.method !== "GET") return;

  e.respondWith(
    caches.match(e.request).then(function (cached) {
      var fetched = fetch(e.request).then(function (response) {
        if (response && response.status === 200) {
          var clone = response.clone();
          caches.open(CACHE).then(function (cache) {
            cache.put(e.request, clone);
          });
        }
        return response;
      }).catch(function () {
        return cached;
      });

      return cached || fetched;
    })
  );
});
