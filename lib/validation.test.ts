import { describe, expect, it } from "vitest";
import { adminPhoneSchema, optionalEmailSchema } from "@/lib/validation.ts";

describe("adminPhoneSchema", () => {
    it("normalizes numbers stored in an older shape", () => {
        expect(adminPhoneSchema.parse("123456789")).toBe("123 456 789");
        expect(adminPhoneSchema.parse("+420123456789")).toBe(
            "+420 123 456 789"
        );
        expect(adminPhoneSchema.parse(" 123 456 789 ")).toBe("123 456 789");
    });

    it("allows no phone at all", () => {
        expect(adminPhoneSchema.parse("")).toBe("");
        expect(adminPhoneSchema.parse("   ")).toBe("");
    });

    it("rejects instead of truncating a number that doesn't fit", () => {
        // formatPhoneNumber alone would turn this into "004 201 234"
        expect(adminPhoneSchema.safeParse("00420123456789").success).toBe(
            false
        );
    });

    it("rejects foreign prefixes, partial numbers and garbage", () => {
        expect(adminPhoneSchema.safeParse("+421 123 456 789").success).toBe(
            false
        );
        expect(adminPhoneSchema.safeParse("12345").success).toBe(false);
        expect(adminPhoneSchema.safeParse("abc").success).toBe(false);
    });
});

describe("optionalEmailSchema", () => {
    it("allows an empty value and trims a real one", () => {
        expect(optionalEmailSchema.parse("")).toBe("");
        expect(optionalEmailSchema.parse(" a@b.cz ")).toBe("a@b.cz");
    });

    it("rejects an invalid email", () => {
        expect(optionalEmailSchema.safeParse("x").success).toBe(false);
    });
});
