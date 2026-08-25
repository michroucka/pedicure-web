import { getCzechNowMinutes, getCzechToday } from "./utils.ts";

const ONE_DAY_MINUTES = 24 * 60;

// How close to a booking's start a client (via magic link) may still cancel
// or reschedule it. Admin isn't subject to this — the pedikérka cancels and
// moves bookings directly, with no time limit.
export const CLIENT_MODIFICATION_WINDOW_HOURS = 24;

export function canClientModifyBooking(date: Date, startTime: number): boolean {
    const today = getCzechToday();
    const daysUntil = Math.round((date.getTime() - today.getTime()) / (ONE_DAY_MINUTES * 60 * 1000));
    const minutesUntil = daysUntil * ONE_DAY_MINUTES + startTime - getCzechNowMinutes();

    return minutesUntil >= CLIENT_MODIFICATION_WINDOW_HOURS * 60;
}
