import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// Normalizes a Date to UTC midnight for its calendar day. `Booking.date` /
// `AvailabilityException.date` are stored this way so exact-match DB
// queries (`where: { date } `) work without timezone drift.
export function toDateOnly(date: Date): Date {
    return new Date(
        Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
    );
}

export function formatTime(time: number) {
    const hours = Math.floor(time / 60);
    const minutes = time % 60;

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/**
 * Formats a phone number string into a human-readable form: optionally +XXX then groups of XXX.
 * Strips all non-digit characters (except a leading +).
 * @param {string} value raw input value
 * @returns {string} formatted phone number
 */
export function formatPhoneNumber(value: string) {
    let cleaned = value.replace(/[^\d+]/g, '');

    // + is only valid at the start
    const hasPlus = cleaned.startsWith('+');
    cleaned = cleaned.replace(/\+/g, '');

    if (hasPlus) {
        // +XXX XXX XXX XXX — max 3 digits for country code + 9 for the local number
        const limited = cleaned.slice(0, 12);
        if (limited.length <= 3) return `+${limited}`;
        if (limited.length <= 6) return `+${limited.slice(0, 3)} ${limited.slice(3)}`;
        if (limited.length <= 9) return `+${limited.slice(0, 3)} ${limited.slice(3, 6)} ${limited.slice(6)}`;
        return `+${limited.slice(0, 3)} ${limited.slice(3, 6)} ${limited.slice(6, 9)} ${limited.slice(9)}`;
    } else {
        // XXX XXX XXX — max 9 digits
        const limited = cleaned.slice(0, 9);
        if (limited.length <= 3) return limited;
        if (limited.length <= 6) return `${limited.slice(0, 3)} ${limited.slice(3)}`;
        return `${limited.slice(0, 3)} ${limited.slice(3, 6)} ${limited.slice(6)}`;
    }
}