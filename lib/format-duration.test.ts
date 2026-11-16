import { describe, expect, it } from "vitest";
import { formatDuration } from "./format-duration";

describe("formatDuration", () => {
    it("formats minutes only, whole hours and mixed durations", () => {
        expect(formatDuration(45)).toBe("45 min");
        expect(formatDuration(60)).toBe("1 h");
        expect(formatDuration(105)).toBe("1 h 45 min");
        expect(formatDuration(120)).toBe("2 h");
    });
});
