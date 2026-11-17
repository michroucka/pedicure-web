import { describe, expect, it } from "vitest";
import { resolveTapToBookStart } from "./tap-to-book-start";

const at = (h: number, m = 0) => h * 60 + m;
const booking = (start: number, end: number) => ({
    startTime: start,
    endTime: end,
});

describe("resolveTapToBookStart", () => {
    const bookings = [
        booking(at(15), at(15, 30)),
        // 15 min gap 15:30–15:45
        booking(at(15, 45), at(16, 30)),
        // 30 min gap 16:30–17:00
        booking(at(17), at(18)),
    ];

    it("keeps the tapped time where the shortest service fits", () => {
        expect(
            resolveTapToBookStart({
                tapped: at(18, 15),
                bookings,
                minDurationMinutes: 30,
            })
        ).toBe(at(18, 15));
    });

    it("offers nothing in a gap shorter than the shortest service", () => {
        expect(
            resolveTapToBookStart({
                tapped: at(15, 30),
                bookings,
                minDurationMinutes: 30,
            })
        ).toBeNull();
    });

    it("moves a tap late in a gap back to where the service still fits", () => {
        expect(
            resolveTapToBookStart({
                tapped: at(16, 45),
                bookings,
                minDurationMinutes: 30,
            })
        ).toBe(at(16, 30));
    });

    it("offers nothing on top of a booking", () => {
        expect(
            resolveTapToBookStart({
                tapped: at(17, 15),
                bookings,
                minDurationMinutes: 30,
            })
        ).toBeNull();
    });

    it("has no limit before the first and after the last booking", () => {
        expect(
            resolveTapToBookStart({
                tapped: at(9),
                bookings,
                minDurationMinutes: 30,
            })
        ).toBe(at(9));
        expect(
            resolveTapToBookStart({
                tapped: at(14, 45),
                bookings,
                minDurationMinutes: 30,
            })
        ).toBe(at(14, 30));
        expect(
            resolveTapToBookStart({
                tapped: at(13),
                bookings: [],
                minDurationMinutes: 30,
            })
        ).toBe(at(13));
    });
});
