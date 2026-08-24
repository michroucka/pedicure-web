import { describe, expect, it } from "vitest";
import {
    computeAvailableSlots,
    computeGaps,
    rangesOverlap,
    resolveDayTimeSlots,
    subtractOne,
    toExceptionRange,
    type TimeSlot,
} from "./availability";

describe("rangesOverlap", () => {
    it("returns false for disjoint ranges", () => {
        expect(
            rangesOverlap({ start: 0, end: 60 }, { start: 60, end: 120 })
        ).toBe(false);
    });

    it("returns true when ranges partially overlap", () => {
        expect(
            rangesOverlap({ start: 0, end: 60 }, { start: 30, end: 90 })
        ).toBe(true);
    });

    it("returns true when one range fully contains the other", () => {
        expect(
            rangesOverlap({ start: 0, end: 120 }, { start: 30, end: 60 })
        ).toBe(true);
    });
});

describe("subtractOne", () => {
    it("returns the slot unchanged when there is no overlap", () => {
        const slot: TimeSlot = { start: 0, end: 60 };
        const blocked: TimeSlot = { start: 100, end: 120 };

        expect(subtractOne(slot, blocked)).toEqual([slot]);
    });

    it("returns an empty array when the block covers the whole slot", () => {
        const slot: TimeSlot = { start: 60, end: 120 };
        const blocked: TimeSlot = { start: 0, end: 180 };

        expect(subtractOne(slot, blocked)).toEqual([]);
    });

    it("splits the slot in two when the block is in the middle", () => {
        const slot: TimeSlot = { start: 0, end: 100 };
        const blocked: TimeSlot = { start: 40, end: 60 };

        expect(subtractOne(slot, blocked)).toEqual([
            { start: 0, end: 40 },
            { start: 60, end: 100 },
        ]);
    });

    it("keeps only the tail when the block overlaps the start", () => {
        const slot: TimeSlot = { start: 0, end: 100 };
        const blocked: TimeSlot = { start: -10, end: 30 };

        expect(subtractOne(slot, blocked)).toEqual([{ start: 30, end: 100 }]);
    });
});

describe("toExceptionRange", () => {
    it("returns the full day when both start and end are null", () => {
        expect(
            toExceptionRange({ type: "BLOCKED", start: null, end: null })
        ).toEqual({ start: 0, end: 24 * 60 });
    });

    it("returns the given range when both are set", () => {
        expect(
            toExceptionRange({ type: "EXTRA_OPEN", start: 60, end: 120 })
        ).toEqual({ start: 60, end: 120 });
    });

    it("throws when only start is set", () => {
        expect(() =>
            toExceptionRange({ type: "BLOCKED", start: 60, end: null })
        ).toThrow();
    });

    it("throws when only end is set", () => {
        expect(() =>
            toExceptionRange({ type: "BLOCKED", start: null, end: 120 })
        ).toThrow();
    });
});

describe("resolveDayTimeSlots", () => {
    const recurring: TimeSlot[] = [{ start: 540, end: 1020 }]; // 9:00-17:00

    it("clears the whole day on a whole-day BLOCKED exception", () => {
        const result = resolveDayTimeSlots(recurring, [
            { type: "BLOCKED", start: null, end: null },
        ]);

        expect(result).toEqual([]);
    });

    it("subtracts a partial BLOCKED range", () => {
        const result = resolveDayTimeSlots(recurring, [
            { type: "BLOCKED", start: 720, end: 780 }, // 12:00-13:00 lunch
        ]);

        expect(result).toEqual([
            { start: 540, end: 720 },
            { start: 780, end: 1020 },
        ]);
    });

    it("adds an EXTRA_OPEN window", () => {
        const result = resolveDayTimeSlots(recurring, [
            { type: "EXTRA_OPEN", start: 1020, end: 1080 }, // extra hour 17:00-18:00
        ]);

        expect(result).toEqual([
            { start: 540, end: 1020 },
            { start: 1020, end: 1080 },
        ]);
    });
});

describe("computeGaps", () => {
    it("returns the whole window when there are no bookings", () => {
        const windows: TimeSlot[] = [{ start: 540, end: 600 }];

        expect(computeGaps(windows, [])).toEqual([{ start: 540, end: 600 }]);
    });

    it("splits around a booking in the middle of the window", () => {
        const windows: TimeSlot[] = [{ start: 540, end: 660 }];
        const bookings: TimeSlot[] = [{ start: 570, end: 600 }];

        expect(computeGaps(windows, bookings)).toEqual([
            { start: 540, end: 570 },
            { start: 600, end: 660 },
        ]);
    });

    it("leaves no gap when a booking exactly fills the window", () => {
        const windows: TimeSlot[] = [{ start: 540, end: 600 }];
        const bookings: TimeSlot[] = [{ start: 540, end: 600 }];

        expect(computeGaps(windows, bookings)).toEqual([]);
    });
});

describe("computeAvailableSlots", () => {
    it("only offers starts that don't leave an unfillable remainder", () => {
        // gap 0-90, service duration 60, shortest service 30, grid 15
        const windows: TimeSlot[] = [{ start: 0, end: 90 }];

        const result = computeAvailableSlots(windows, [], 60, 30);

        // start=15 would leave a 15min gap before it (< 30) -> excluded
        expect(result).toEqual([0, 30]);
    });

    it("returns an empty array when nothing fits", () => {
        const windows: TimeSlot[] = [{ start: 0, end: 20 }];

        expect(computeAvailableSlots(windows, [], 30, 30)).toEqual([]);
    });
});
