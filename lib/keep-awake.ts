import { useSyncExternalStore } from "react";

// Per-device preference (tablet in the salon yes, phone no), so it lives in
// localStorage rather than on AdminUser. localStorage is the single source
// of truth; components read it through useSyncExternalStore.
const STORAGE_KEY = "keep-awake";

// The `storage` event only fires in *other* tabs, so writes in this tab
// announce themselves with a custom event.
const CHANGE_EVENT = "keep-awake-change";

function subscribe(onChange: () => void) {
    window.addEventListener(CHANGE_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
        window.removeEventListener(CHANGE_EVENT, onChange);
        window.removeEventListener("storage", onChange);
    };
}

// localStorage can throw (private mode, blocked site data) – treat that as
// "off" instead of crashing the admin.
function getSnapshot() {
    try {
        return localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
        return false;
    }
}

function getServerSnapshot() {
    return false;
}

export function useKeepAwakeEnabled() {
    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function setKeepAwakeEnabled(enabled: boolean) {
    try {
        if (enabled) localStorage.setItem(STORAGE_KEY, "1");
        else localStorage.removeItem(STORAGE_KEY);
    } catch {
        // Nothing stored – the snapshot stays unchanged, so the switch
        // simply doesn't flip.
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
}
