// DivergenceIQ Service Worker
const CACHE_NAME = "divergenceiq-v1";
const urlsToCache = ["/", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Network-first for API, cache-first for assets
  if (event.request.url.includes("/api/") || event.request.url.includes("supabase")) {
    return;
  }
  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request)),
  );
});
