"use client"

import { Switch } from "@/components/ui/switch.tsx"
import {
    Field,
    FieldContent,
    FieldDescription,
    FieldGroup,
    FieldLabel,
    FieldTitle,
} from "@/components/ui/field.tsx";
import { Alert, AlertDescription } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";
import { useEffect, useState } from "react";
import {
    savePushSubscriptionAction,
    deletePushSubscriptionAction,
    sendTestPushAction,
} from "@/app/(admin)/(dashboard)/nastaveni/actions.ts"

function requestNotificationPermission() {
    return new Promise((resolve, reject) => {
        const result = Notification.requestPermission(resolve);
        if (result) result.then(resolve, reject);
    });
}

function urlBase64ToUint8Array(base64String: Base64URLString) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, "+")
        .replace(/_/g, "/");
    const rawData = atob(base64);
    return Uint8Array.from(rawData, (char) => char.charCodeAt(0));
}

export function PushSubscribeFlow() {
    const [isStandalone, setIsStandalone] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isPending, setIsPending] = useState(false);
    const [isTestSending, setIsTestSending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setIsStandalone(
            window.matchMedia("(display-mode: standalone)").matches
        );

        if (!("serviceWorker" in navigator)) return;
        navigator.serviceWorker.ready
            .then((registration) => registration.pushManager.getSubscription())
            .then((subscription) => setIsSubscribed(subscription !== null))
            .catch(() => {});
    }, []);

    async function handlePushSubscribeFlow() {
        setError(null);
        setIsPending(true);
        try {
            const permission = await requestNotificationPermission();
            if (permission !== "granted") {
                setError("Notifikace nebyly povoleny.");
                return;
            }
            const registration = await navigator.serviceWorker.ready;
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
            setIsSubscribed(true);
        } catch (error) {
            console.error("Push subscribe failed:", error);
            setError("Zapnutí notifikací se nepovedlo. Zkuste to prosím znovu.");
        } finally {
            setIsPending(false);
        }
    }

    async function handlePushUnsubscribeFlow() {
        setError(null);
        setIsPending(true);
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            if (subscription) {
                const { endpoint } = subscription;
                await subscription.unsubscribe();
                await deletePushSubscriptionAction(endpoint);
            }
            setIsSubscribed(false);
        } catch (error) {
            console.error("Push unsubscribe failed:", error);
            setError("Vypnutí notifikací se nepovedlo. Zkuste to prosím znovu.");
        } finally {
            setIsPending(false);
        }
    }

    async function handleSendTestPush() {
        setError(null);
        setIsTestSending(true);
        try {
            const result = await sendTestPushAction();
            if (!result?.ok) {
                setError("Odeslání testovací notifikace se nepovedlo.");
            }
        } catch (error) {
            console.error("Send test push failed:", error);
            setError("Odeslání testovací notifikace se nepovedlo.");
        } finally {
            setIsTestSending(false);
        }
    }

    return (
        <FieldGroup className="w-full">
            {error && (
                <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
            <FieldLabel htmlFor="switch-notifications">
                <Field orientation="horizontal">
                    <FieldContent>
                        <FieldTitle className="font-heading text-base font-medium">
                            Zapnout push notifikace
                        </FieldTitle>
                        <FieldDescription>
                            {isStandalone
                                ? "Zapnutím povolíte push notifikace, které se zobrazí při nově vytvořené rezervaci."
                                : "Pro zapnutí notifikací musíte aplikaci přidat na plochu."}
                        </FieldDescription>
                    </FieldContent>
                    <Switch
                        id="switch-notifications"
                        checked={isSubscribed}
                        disabled={!isStandalone || isPending}
                        onCheckedChange={(checked) => {
                            if (checked) handlePushSubscribeFlow();
                            else handlePushUnsubscribeFlow();
                        }}
                    />
                </Field>
            </FieldLabel>
            {isSubscribed && (
                <Button
                    type="button"
                    variant="outline"
                    onClick={handleSendTestPush}
                    disabled={isTestSending}
                >
                    {isTestSending
                        ? "Odesílám..."
                        : "Odeslat testovací notifikaci"}
                </Button>
            )}
        </FieldGroup>
    );
}