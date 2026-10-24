"use client";

import { useEffect, useState } from "react";
import { getExtraMinutesAction } from "@/app/rezervace/actions.ts";

const LOOKUP_DEBOUNCE_MS = 400;

// Extra time is tied to an existing client match, only knowable once both
// the (main contact's) name and phone are filled in - looked up as the user
// types, instead of surprising them with a longer slot only after submit.
// Guests in a group never have extra time, so only the main contact is
// passed in.
export function useClientExtraMinutes(
    name: string | undefined,
    phone: string | undefined,
    initialExtraMinutes: number
): number {
    const [extraMinutes, setExtraMinutes] = useState(initialExtraMinutes);

    useEffect(() => {
        let cancelled = false;
        const timeout = setTimeout(() => {
            if (!name?.trim() || !phone?.trim()) {
                if (!cancelled) setExtraMinutes(0);
                return;
            }
            getExtraMinutesAction({ name, phone }).then((minutes) => {
                if (!cancelled) setExtraMinutes(minutes);
            });
        }, LOOKUP_DEBOUNCE_MS);
        return () => {
            cancelled = true;
            clearTimeout(timeout);
        };
    }, [name, phone]);

    return extraMinutes;
}
