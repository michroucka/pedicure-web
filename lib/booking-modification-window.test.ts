import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { canClientModifyBooking } from "./booking-modification-window";

// "Now" = 2026-06-15T08:00:00Z, which is 10:00 in Europe/Prague (CEST,
// UTC+2 in June) — so getCzechToday() is 2026-06-15 and getCzechNowMinutes()
// is 600 (10:00). Booking dates below use the same UTC-midnight convention
// as toDateOnly()/Booking.date.
describe("canClientModifyBooking", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-06-15T08:00:00.000Z"));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("allows a booking more than 24h away", () => {
        const tomorrow = new Date(Date.UTC(2026, 5, 16));
        expect(canClientModifyBooking(tomorrow, 610)).toBe(true); // 24h10m out
    });

    it("allows a booking exactly 24h away (boundary is inclusive)", () => {
        const tomorrow = new Date(Date.UTC(2026, 5, 16));
        expect(canClientModifyBooking(tomorrow, 600)).toBe(true); // exactly 24h
    });

    it("rejects a booking one minute short of 24h away", () => {
        const tomorrow = new Date(Date.UTC(2026, 5, 16));
        expect(canClientModifyBooking(tomorrow, 599)).toBe(false); // 23h59m out
    });

    it("rejects a booking later today", () => {
        const today = new Date(Date.UTC(2026, 5, 15));
        expect(canClientModifyBooking(today, 700)).toBe(false);
    });

    it("allows a booking well into the future", () => {
        const nextMonth = new Date(Date.UTC(2026, 6, 1));
        expect(canClientModifyBooking(nextMonth, 540)).toBe(true);
    });
});
