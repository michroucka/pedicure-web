"use client";

import { useEffect, useState } from "react";
import { SunDim } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useKeepAwakeEnabled } from "@/lib/keep-awake";

// Events that count as user activation on iOS. touchend rather than
// touchstart/pointerdown (those don't activate), click/keydown for the rest.
const USER_ACTIVATION_EVENTS = ["touchend", "click", "keydown"] as const;

function isPermissionDenied(error: unknown) {
    return error instanceof Error && error.name === "NotAllowedError";
}

// Holds a screen wake lock while the "always on" setting is enabled. Lives
// in the dashboard layout, which survives soft navigation, so the lock isn't
// dropped and re-requested on every page change.
//
// WebKit only lets a page re-acquire a lock it already held without a user
// gesture. After the app is fully closed and reopened the first request needs
// one, so a denied request shows a banner and the next tap anywhere retries.
export function KeepAwake() {
    const enabled = useKeepAwakeEnabled();
    const [needsUserGesture, setNeedsUserGesture] = useState(false);

    useEffect(() => {
        if (!enabled || !("wakeLock" in navigator)) return;

        let cancelled = false;
        let requestInFlight = false;
        let sentinel: WakeLockSentinel | null = null;

        async function acquire() {
            if (document.visibilityState !== "visible") return;
            if (requestInFlight || (sentinel && !sentinel.released)) return;
            requestInFlight = true;
            try {
                // Must stay the first await: the gesture's activation only
                // covers a request made synchronously inside its handler.
                const fresh = await navigator.wakeLock.request("screen");
                // request() is async: the effect may have been cleaned up
                // (setting turned off, unmount, StrictMode re-run) or another
                // acquire() may have won the race meanwhile. Either way this
                // lock has no owner – release it instead of leaking it.
                if (cancelled || (sentinel && !sentinel.released)) {
                    void fresh.release();
                    return;
                }
                sentinel = fresh;
                setNeedsUserGesture(false);
            } catch (error) {
                console.error("Wake lock request failed:", error);
                if (!cancelled && isPermissionDenied(error))
                    setNeedsUserGesture(true);
            } finally {
                requestInFlight = false;
            }
        }

        function handleUserActivation() {
            void acquire();
        }

        // The browser releases the lock whenever the page is hidden
        // (switching apps, locking the iPad), so take it again on return.
        function handleVisibilityChange() {
            if (document.visibilityState === "visible") void acquire();
        }

        void acquire();
        document.addEventListener("visibilitychange", handleVisibilityChange);
        // Capture phase so a component calling stopPropagation() can't
        // swallow the tap before it reaches us.
        for (const eventName of USER_ACTIVATION_EVENTS)
            document.addEventListener(eventName, handleUserActivation, true);

        return () => {
            cancelled = true;
            setNeedsUserGesture(false);
            document.removeEventListener(
                "visibilitychange",
                handleVisibilityChange
            );
            for (const eventName of USER_ACTIVATION_EVENTS)
                document.removeEventListener(
                    eventName,
                    handleUserActivation,
                    true
                );
            void sentinel?.release();
        };
    }, [enabled]);

    if (!needsUserGesture) return null;

    return (
        <div
            role="status"
            className="flex items-center gap-3 border-b-2 border-primary bg-primary/15 px-4 py-3 text-foreground"
        >
            <SunDim className="size-6 shrink-0 animate-pulse text-primary motion-reduce:animate-none" />
            <div className="min-w-0 flex-1">
                <p className="text-base font-medium">Obrazovka může zhasnout</p>
                <p className="hidden text-sm sm:block">
                    Klepnutím ji necháte rozsvícenou.
                </p>
            </div>
            {/* No onClick: the tap itself is the user activation, picked up by
                the document-level listener like a tap anywhere else. */}
            <Button
                type="button"
                size="lg"
                className="h-11 px-5"
            >
                Nechat svítit
            </Button>
        </div>
    );
}
