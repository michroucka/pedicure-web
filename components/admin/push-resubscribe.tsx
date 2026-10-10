"use client";

import { useEffect } from "react";
import { subscribeAndSave } from "@/lib/push-client.ts";
import { PUSH_RESUBSCRIBE_DEBUG_KEY } from "@/components/admin/push-debug-panel.tsx";

// TEMP: lets PushDebugPanel show the outcome without a Mac attached for
// the Safari console.
function logDebug(message: string) {
    localStorage.setItem(
        PUSH_RESUBSCRIBE_DEBUG_KEY,
        `${new Date().toLocaleString("cs-CZ")} – ${message}`
    );
}

// iOS can silently drop a push subscription while notification permission
// stays granted, and Safari doesn't fire `pushsubscriptionchange`, so the
// app never finds out. On every app open, if permission is granted but the
// subscription is gone, quietly subscribe again. Never asks for permission
// here — that would pop a dialog without a user gesture.
export function PushResubscribe() {
    useEffect(() => {
        if (!("serviceWorker" in navigator) || !("Notification" in window)) return;
        if (Notification.permission !== "granted") return;

        navigator.serviceWorker.ready
            .then(async (registration) => {
                const subscription = await registration.pushManager.getSubscription();
                if (subscription) return;
                await subscribeAndSave(registration);
                logDebug("OK, nová subscription uložena");
            })
            .catch((error) => {
                console.error("Push re-subscribe failed:", error);
                logDebug(`chyba: ${String(error)}`);
            });
    }, []);

    return null;
}
