// Minimal service worker — exists only to satisfy PWA installability (some
// browsers require a controlling service worker with a fetch handler before
// they'll offer "Add to Home Screen"). No caching on purpose: this is a
// low-traffic admin tool and stale bookings/availability would be a real
// bug, not a convenience. Push/notificationclick handlers land here once
// Web Push is built.
self.addEventListener("install", () => {
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
    event.respondWith(fetch(event.request));
});
