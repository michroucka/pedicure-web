import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// NFD decomposes accented chars into base + combining marks, which the
// regex then removes (U+0300-U+036F is the Unicode combining diacritical
// marks block).
const COMBINING_MARKS = /[\u0300-\u036f]/g;

export function stripDiacritics(value: string): string {
    return value.normalize("NFD").replace(COMBINING_MARKS, "");
}

// For accent-insensitive search ("cara" matches "Čára").
export function normalizeForSearch(value: string): string {
    return stripDiacritics(value).toLowerCase();
}

// Normalizes a Date to UTC midnight for its calendar day. `Booking.date` /
// `AvailabilityException.date` are stored this way so exact-match DB
// queries (`where: { date } `) work without timezone drift.
export function toDateOnly(date: Date): Date {
    return new Date(
        Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
    );
}

export function toUtcMidnight(d: Date): Date {
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// Pure UTC day arithmetic — unlike date-fns's addDays/startOfWeek, this never
// touches the server's local timezone, so it's safe on already UTC-midnight
// dates (toDateOnly/getCzechToday output).
export function addUtcDays(date: Date, days: number): Date {
    return new Date(date.getTime() + days * ONE_DAY_MS);
}

// Monday of the week containing `date` (date must be UTC midnight).
export function startOfWeekUtc(date: Date): Date {
    const dayOfWeek = date.getUTCDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    return addUtcDays(date, diff);
}

// Today's calendar date in Europe/Prague, as UTC midnight (matches toDateOnly's
// convention). Independent of the server's own OS timezone.
export function getCzechToday(): Date {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Europe/Prague",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(new Date());

    const year = Number(parts.find((p) => p.type === "year")?.value);
    const month = Number(parts.find((p) => p.type === "month")?.value);
    const day = Number(parts.find((p) => p.type === "day")?.value);

    return new Date(Date.UTC(year, month - 1, day));
}

// Current time of day in Europe/Prague, as minutes since midnight. Used to
// hide already-passed slots when admin actions allow booking/moving to today.
export function getCzechNowMinutes(): number {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/Prague",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    }).formatToParts(new Date());

    const hour = Number(parts.find((p) => p.type === "hour")?.value);
    const minute = Number(parts.find((p) => p.type === "minute")?.value);

    return hour * 60 + minute;
}

export function formatTime(time: number) {
    const hours = Math.floor(time / 60);
    const minutes = time % 60;

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function parseTime(time: string): number {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
}

// Snaps a "HH:MM" value to the nearest 15-minute mark (remainder 0-7 rounds
// down, 8-14 rounds up) — the time input's native `step` isn't honored
// consistently across browsers, so we enforce it ourselves on blur.
export function roundToQuarterHour(time: string): string {
    if (!/^\d{2}:\d{2}$/.test(time)) return time;

    const total = parseTime(time);
    const remainder = total % 15;
    const rounded =
        remainder <= 7 ? total - remainder : total + (15 - remainder);

    return formatTime(((rounded % 1440) + 1440) % 1440);
}

/**
 * Formats a phone number string into a human-readable form: optionally +XXX then groups of XXX.
 * Strips all non-digit characters (except a leading +).
 * @param {string} value raw input value
 * @returns {string} formatted phone number
 */
export function formatPhoneNumber(value: string) {
    let cleaned = value.replace(/[^\d+]/g, "");

    // + is only valid at the start
    const hasPlus = cleaned.startsWith("+");
    cleaned = cleaned.replace(/\+/g, "");

    if (hasPlus) {
        // +XXX XXX XXX XXX — max 3 digits for country code + 9 for the local number
        const limited = cleaned.slice(0, 12);
        if (limited.length <= 3) return `+${limited}`;
        if (limited.length <= 6)
            return `+${limited.slice(0, 3)} ${limited.slice(3)}`;
        if (limited.length <= 9)
            return `+${limited.slice(0, 3)} ${limited.slice(3, 6)} ${limited.slice(6)}`;
        return `+${limited.slice(0, 3)} ${limited.slice(3, 6)} ${limited.slice(6, 9)} ${limited.slice(9)}`;
    } else {
        // XXX XXX XXX — max 9 digits
        const limited = cleaned.slice(0, 9);
        if (limited.length <= 3) return limited;
        if (limited.length <= 6)
            return `${limited.slice(0, 3)} ${limited.slice(3)}`;
        return `${limited.slice(0, 3)} ${limited.slice(3, 6)} ${limited.slice(6)}`;
    }
}

// Normalizes a phone number for equality comparisons: digits only, with a
// leading Czech country code (420) stripped, so "+420 123 123 123" and
// "123 123 123" are treated as the same number when matching clients.
export function normalizePhoneForMatch(value: string): string {
    const digits = value.replace(/\D/g, "");
    return digits.startsWith("420") && digits.length > 9
        ? digits.slice(3)
        : digits;
}

// Adds the Czech country code when the stored number doesn't already have
// one — some client records have it, some don't — and strips everything
// else down to bare digits. E.164 without the leading `+`, which is what
// both `tel:` hrefs and the SMSManager API expect.
export function toE164(value: string): string {
    const digits = value.replace(/\D/g, "");
    return digits.startsWith("420") && digits.length > 9
        ? digits
        : `420${digits}`;
}

// Builds a `tel:` href from a stored phone number — see toE164.
export function toTelHref(value: string): string {
    return `tel:+${toE164(value)}`;
}
