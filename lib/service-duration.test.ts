import { describe, expect, it } from "vitest";
import { sumServiceDurations } from "./service-duration.ts";

describe("sumServiceDurations", () => {
    const services = [
        { id: 1, durationMinutes: 30 },
        { id: 2, durationMinutes: 60 },
    ];

    it("counts a service once per person, even when fetched only once", () => {
        expect(sumServiceDurations([1, 1, 2], services)).toBe(120);
    });

    it("counts an unknown id as zero", () => {
        expect(sumServiceDurations([1, 99], services)).toBe(30);
    });
});
