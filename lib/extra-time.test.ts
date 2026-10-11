import { describe, expect, it } from "vitest";
import { normalizeExtraMinutes } from "@/lib/extra-time.ts";

describe("normalizeExtraMinutes", () => {
    it("keeps multiples of 5 as they are", () => {
        expect(normalizeExtraMinutes(0)).toBe(0);
        expect(normalizeExtraMinutes(5)).toBe(5);
        expect(normalizeExtraMinutes(15)).toBe(15);
        expect(normalizeExtraMinutes(40)).toBe(40);
    });

    it("rounds anything else to the nearest multiple of 5", () => {
        expect(normalizeExtraMinutes(7)).toBe(5);
        expect(normalizeExtraMinutes(8)).toBe(10);
        expect(normalizeExtraMinutes(12.5)).toBe(15);
        expect(normalizeExtraMinutes(2)).toBe(0);
    });

    it("never returns a negative value", () => {
        expect(normalizeExtraMinutes(-20)).toBe(0);
        expect(normalizeExtraMinutes(-3)).toBe(0);
    });

    it("treats non-numbers as no extra time", () => {
        expect(normalizeExtraMinutes(NaN)).toBe(0);
        expect(normalizeExtraMinutes(Infinity)).toBe(0);
    });
});
