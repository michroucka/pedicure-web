// Service worker for the admin PWA: Web Push only. No fetch handler and no
// caching on purpose - stale bookings/availability would be a real bug, and
// a pass-through fetch handler only adds latency to every request (current
// Chrome no longer needs one for "Add to Home Screen", iOS never did).
self.addEventListener("install", () => {
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
    // A push without a (valid JSON) payload, e.g. a test push from DevTools,
    // still has to show something - iOS can revoke push permission for
    // pushes that end without a notification.
    let data = {};
    try {
        data = event.data?.json() ?? {};
    } catch {}
    event.waitUntil(
      self.registration.showNotification(data.title ?? "Nohy v cajku", {
          body: data.body ?? "",
          icon: "/pwa-icon-alt-192.png",
          data: { url: data.url },
      })
    );
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const url = event.notification.data?.url ?? "/kalendar";
    event.waitUntil(
      clients
        .matchAll({ type: "window", includeUncontrolled: true })
        .then((clientList) => {
            for (const client of clientList) {
                if (client.url.includes(url) && "focus" in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) return clients.openWindow(url);
        })
    );
});
