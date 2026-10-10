"use client";

// TEMP: test helper for the silent re-subscribe in PushResubscribe — remove
// together with the localStorage writes in push-resubscribe.tsx once tested.
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button.tsx";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card.tsx";

export const PUSH_RESUBSCRIBE_DEBUG_KEY = "push-resubscribe-debug";

export function PushDebugPanel() {
    const [lastResult, setLastResult] = useState<string | null>(null);
    const [status, setStatus] = useState<string | null>(null);

    useEffect(() => {
        setLastResult(localStorage.getItem(PUSH_RESUBSCRIBE_DEBUG_KEY));
    }, []);

    // Simulates iOS dropping the subscription: unsubscribes in the browser
    // only, leaves the DB row and notification permission untouched.
    async function dropSubscription() {
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            if (!subscription) {
                setStatus("Žádná subscription v prohlížeči není.");
                return;
            }
            await subscription.unsubscribe();
            setStatus("Subscription zrušena – zavřete a znovu otevřete appku.");
        } catch (error) {
            setStatus(`Chyba: ${String(error)}`);
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Test push (dočasné)</CardTitle>
                <CardDescription>
                    Poslední re-subscribe: {lastResult ?? "zatím neproběhl"}
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
                <Button variant="outline" onClick={dropSubscription}>
                    Zrušit subscription jen v prohlížeči
                </Button>
                {status && <p className="text-sm">{status}</p>}
            </CardContent>
        </Card>
    );
}
