"use client";

import { useEffect } from "react";
import { subscribeAndSave } from "@/lib/push-client.ts";

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
            })
            .catch((error) => {
                console.error("Push re-subscribe failed:", error);
            });
    }, []);

    return null;
}
