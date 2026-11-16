"use client";

import { useEffect } from "react";

// What the client typed into the details form, kept for the moments the
// server sends them back to it (booking limit, failed bot check, slot taken
// meanwhile) - a redirect would otherwise wipe the form. sessionStorage:
// this tab only, gone when it closes; cleared once the booking is made.
const DRAFT_KEY = "booking-details-draft";

export type BookingDraft = {
    names: string[];
    phone: string;
    email: string;
};

export function saveBookingDraft(draft: BookingDraft) {
    try {
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
        // Private mode or blocked storage - the form just won't be refilled.
    }
}

export function clearBookingDraft() {
    try {
        sessionStorage.removeItem(DRAFT_KEY);
    } catch {}
}

function readBookingDraft(): BookingDraft | null {
    try {
        const raw = sessionStorage.getItem(DRAFT_KEY);
        if (!raw) return null;
        const draft = JSON.parse(raw) as Partial<BookingDraft>;
        return {
            names: Array.isArray(draft.names) ? draft.names.map(String) : [],
            phone: String(draft.phone ?? ""),
            email: String(draft.email ?? ""),
        };
    } catch {
        return null;
    }
}

// Refills the form after mount - reading storage during render would
// differ between server and client and break hydration.
export function useRestoreBookingDraft(restore: (draft: BookingDraft) => void) {
    useEffect(() => {
        const draft = readBookingDraft();
        if (draft) restore(draft);
        // Only on mount: restoring again later would overwrite new typing.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
}

// Rendered on the confirmation page - the booking went through, so the
// draft has served its purpose.
export function ClearBookingDraft() {
    useEffect(() => {
        clearBookingDraft();
    }, []);
    return null;
}
