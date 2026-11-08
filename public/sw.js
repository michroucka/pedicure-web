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
    const targetUrl = new URL(
        event.notification.data?.url ?? "/kalendar",
        self.location.origin
    ).href;
    event.waitUntil(showInAppWindow(targetUrl));
});

// The app runs permanently on the salon tablet, so the click reuses that
// window (navigated to the booking's week) instead of opening a duplicate.
// navigate() throws for a window this worker doesn't control (e.g. opened
// before the worker was installed) - then a new window is the fallback.
async function showInAppWindow(targetUrl) {
    const windows = await clients.matchAll({
        type: "window",
        includeUncontrolled: true,
    });
    const appWindow = windows.find((window) => "focus" in window);
    if (appWindow) {
        const focusedWindow = await appWindow.focus();
        if (focusedWindow.url === targetUrl) return;
        try {
            await focusedWindow.navigate(targetUrl);
            return;
        } catch {}
    }
    if (clients.openWindow) await clients.openWindow(targetUrl);
}
