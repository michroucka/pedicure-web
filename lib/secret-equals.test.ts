import { describe, expect, it } from "vitest";
import { secretEquals } from "./secret-equals.ts";

describe("secretEquals", () => {
    it("matches only the exact secret", () => {
        expect(secretEquals("abc123", "abc123")).toBe(true);
        expect(secretEquals("abc124", "abc123")).toBe(false);
        expect(secretEquals("abc", "abc123")).toBe(false);
        expect(secretEquals("", "abc123")).toBe(false);
    });
});
