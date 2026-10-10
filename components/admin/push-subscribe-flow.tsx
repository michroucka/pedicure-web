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
import { useEffect, useState } from "react";
import { deletePushSubscriptionAction } from "@/app/(admin)/(dashboard)/nastaveni/actions.ts"
import { subscribeAndSave } from "@/lib/push-client.ts"

function requestNotificationPermission() {
    return new Promise((resolve, reject) => {
        const result = Notification.requestPermission(resolve);
        if (result) result.then(resolve, reject);
    });
}

export function PushSubscribeFlow() {
    const [isStandalone, setIsStandalone] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isPending, setIsPending] = useState(false);
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
            await subscribeAndSave(registration);
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
        </FieldGroup>
    );
}