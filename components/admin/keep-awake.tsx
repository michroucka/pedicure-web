"use client";

import { useEffect } from "react";
import { useKeepAwakeEnabled } from "@/lib/keep-awake.ts";

// Holds a screen wake lock while the "always on" setting is enabled. Lives
// in the dashboard layout, which survives soft navigation, so the lock isn't
// dropped and re-requested on every page change.
export function KeepAwake() {
    const enabled = useKeepAwakeEnabled();

    useEffect(() => {
        if (!enabled || !("wakeLock" in navigator)) return;

        let cancelled = false;
        let sentinel: WakeLockSentinel | null = null;

        async function acquire() {
            if (document.visibilityState !== "visible") return;
            if (sentinel && !sentinel.released) return;
            try {
                const fresh = await navigator.wakeLock.request("screen");
                // request() is async: the effect may have been cleaned up
                // (setting turned off, unmount, StrictMode re-run) or another
                // acquire() may have won the race meanwhile. Either way this
                // lock has no owner — release it instead of leaking it.
                if (cancelled || (sentinel && !sentinel.released)) {
                    void fresh.release();
                    return;
                }
                sentinel = fresh;
            } catch (error) {
                console.error("Wake lock request failed:", error);
            }
        }

        // The browser releases the lock whenever the page is hidden
        // (switching apps, locking the iPad), so take it again on return.
        function handleVisibilityChange() {
            if (document.visibilityState === "visible") void acquire();
        }

        void acquire();
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            cancelled = true;
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            void sentinel?.release();
        };
    }, [enabled]);

    return null;
}
