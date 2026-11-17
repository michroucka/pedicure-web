import { describe, expect, it } from "vitest";
import { adminCalendarUrl, formatPushDateTime } from "./booking-push-format";

describe("formatPushDateTime", () => {
    it("formats a Czech date with the weekday, genitive month name and time", () => {
        expect(formatPushDateTime(new Date(2026, 10, 16), 9 * 60 + 30)).toBe(
            "pondělí 16. listopadu 2026 09:30"
        );
        expect(formatPushDateTime(new Date(2027, 0, 1), 0)).toBe(
            "pátek 1. ledna 2027 00:00"
        );
    });
});

describe("adminCalendarUrl", () => {
    it("links to the calendar week by the UTC-midnight date", () => {
        expect(adminCalendarUrl(new Date(Date.UTC(2026, 10, 16)))).toBe(
            "/kalendar?date=2026-11-16"
        );
    });
});
