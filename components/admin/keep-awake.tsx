"use client";

import { useEffect } from "react";
import { useKeepAwakeEnabled } from "@/lib/keep-awake.ts";
import { logKeepAwakeEvent } from "@/lib/keep-awake-log.ts";

const LOCK_STATE_CHECK_INTERVAL_MS = 60_000;

// Holds a screen wake lock while the "always on" setting is enabled. Lives
// in the dashboard layout, which survives soft navigation, so the lock isn't
// dropped and re-requested on every page change.
export function KeepAwake() {
    const enabled = useKeepAwakeEnabled();

    useEffect(() => {
        if (!enabled || !("wakeLock" in navigator)) return;

        let cancelled = false;
        let sentinel: WakeLockSentinel | null = null;
        logKeepAwakeEvent("start");

        async function acquire(trigger: string) {
            if (document.visibilityState !== "visible") {
                logKeepAwakeEvent(`${trigger}: přeskočeno, stránka skrytá`);
                return;
            }
            if (sentinel && !sentinel.released) return;
            try {
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
                fresh.addEventListener("release", () => {
                    logKeepAwakeEvent(
                        `zámek uvolněn (stránka ${document.visibilityState})`
                    );
                });
                logKeepAwakeEvent(`${trigger}: zámek získán`);
            } catch (error) {
                const reason =
                    error instanceof Error
                        ? `${error.name}: ${error.message}`
                        : String(error);
                logKeepAwakeEvent(`${trigger}: získání selhalo – ${reason}`);
                console.error("Wake lock request failed:", error);
            }
        }

        // The browser releases the lock whenever the page is hidden
        // (switching apps, locking the iPad), so take it again on return.
        function handleVisibilityChange() {
            logKeepAwakeEvent(`visibilitychange: ${document.visibilityState}`);
            if (document.visibilityState === "visible")
                void acquire("visibilitychange");
        }

        // Diagnostics only: shows whether iPadOS fires these at all, before
        // relying on them as extra re-acquire triggers.
        function handlePageShow(event: PageTransitionEvent) {
            logKeepAwakeEvent(`pageshow (persisted: ${event.persisted})`);
        }
        function handleFocus() {
            logKeepAwakeEvent("focus");
        }

        // Catches the lock disappearing without a "release" event. Logs only
        // state changes so the bounded log isn't flooded with heartbeats.
        let lastLockState = "";
        const lockStateCheck = setInterval(() => {
            const lockState = !sentinel
                ? "žádný"
                : sentinel.released
                  ? "uvolněný"
                  : "drží";
            if (lockState === lastLockState) return;
            lastLockState = lockState;
            logKeepAwakeEvent(
                `kontrola: zámek ${lockState}, stránka ${document.visibilityState}`
            );
        }, LOCK_STATE_CHECK_INTERVAL_MS);

        void acquire("start");
        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("pageshow", handlePageShow);
        window.addEventListener("focus", handleFocus);

        return () => {
            cancelled = true;
            logKeepAwakeEvent("stop");
            clearInterval(lockStateCheck);
            document.removeEventListener(
                "visibilitychange",
                handleVisibilityChange
            );
            window.removeEventListener("pageshow", handlePageShow);
            window.removeEventListener("focus", handleFocus);
            void sentinel?.release();
        };
    }, [enabled]);

    return null;
}
