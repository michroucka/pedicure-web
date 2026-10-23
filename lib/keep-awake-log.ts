import { useSyncExternalStore } from "react";

// Temporary diagnostics for the wake lock dropping after a while on the
// salon iPad. The failure happens hours later with nobody watching, so the
// events are kept on the device and read back in /nastaveni.
const STORAGE_KEY = "keep-awake-log";
const CHANGE_EVENT = "keep-awake-log-change";
const MAX_ENTRIES = 100;

export type KeepAwakeLogEntry = {
    at: string;
    message: string;
};

function readEntries(): KeepAwakeLogEntry[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? (JSON.parse(raw) as KeepAwakeLogEntry[]) : [];
    } catch {
        return [];
    }
}

export function logKeepAwakeEvent(message: string) {
    const entry = { at: new Date().toISOString(), message };
    try {
        const entries = [...readEntries(), entry].slice(-MAX_ENTRIES);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch {
        // Diagnostics must never break the wake lock itself.
    }
    console.info("[keep-awake]", message);
    window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function clearKeepAwakeLog() {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch {
        // Nothing to clear.
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onChange: () => void) {
    window.addEventListener(CHANGE_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
        window.removeEventListener(CHANGE_EVENT, onChange);
        window.removeEventListener("storage", onChange);
    };
}

// Returns the raw string: useSyncExternalStore compares snapshots by
// identity, so a freshly parsed array would re-render forever.
function getSnapshot() {
    try {
        return localStorage.getItem(STORAGE_KEY) ?? "";
    } catch {
        return "";
    }
}

function getServerSnapshot() {
    return "";
}

export function useKeepAwakeLog(): KeepAwakeLogEntry[] {
    const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
    if (!raw) return [];
    try {
        return JSON.parse(raw) as KeepAwakeLogEntry[];
    } catch {
        return [];
    }
}
