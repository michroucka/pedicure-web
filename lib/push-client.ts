import { savePushSubscriptionAction } from "@/app/(admin)/(dashboard)/nastaveni/actions.ts";

function urlBase64ToUint8Array(base64String: Base64URLString) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, "+")
        .replace(/_/g, "/");
    const rawData = atob(base64);
    return Uint8Array.from(rawData, (char) => char.charCodeAt(0));
}

// Shared by the manual toggle in /nastaveni and the silent re-subscribe on
// app open, so both always subscribe with the same VAPID key and persist
// the same fields.
export async function subscribeAndSave(registration: ServiceWorkerRegistration) {
    const applicationServerKey = urlBase64ToUint8Array(
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""
    );
    const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
    });
    const pushSubscriptionJSON = pushSubscription.toJSON();
    await savePushSubscriptionAction({
        endpoint: pushSubscriptionJSON.endpoint ?? "",
        p256dh: pushSubscriptionJSON.keys?.p256dh ?? "",
        auth: pushSubscriptionJSON.keys?.auth ?? "",
        userAgent: navigator.userAgent,
    });
}
