// Deliberately minimal: this app is booking/rewards/DB-driven, so caching
// pages or API responses risks showing stale data (a "confirmed" booking
// that's since been cancelled, an expired voucher, etc). The only thing
// this service worker does is swap in a friendly offline page when a
// navigation request fails outright — everything else passes straight
// through to the network, uncached.
const OFFLINE_URL = "/offline.html";
const CACHE_NAME = "wano-offline-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.add(OFFLINE_URL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;

  event.respondWith(
    fetch(event.request).catch(() => caches.match(OFFLINE_URL)),
  );
});
