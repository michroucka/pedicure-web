import { describe, expect, it } from "vitest";
import { dayOverrideSchema, daySchema } from "./schema.ts";

const overlapping = [
    { startTime: "09:00", endTime: "12:00" },
    { startTime: "11:00", endTime: "14:00" },
];
const touching = [
    { startTime: "12:00", endTime: "14:00" },
    { startTime: "09:00", endTime: "12:00" },
];

describe("block overlap — same rule for the weekly schedule and a day override", () => {
    it("rejects overlapping blocks", () => {
        const weekly = daySchema.safeParse({ dayOfWeek: 1, blocks: overlapping });
        const override = dayOverrideSchema.safeParse({ date: "2026-10-20", blocks: overlapping });

        expect(weekly.success).toBe(false);
        expect(weekly.error?.issues[0]).toMatchObject({
            message: "Bloky se překrývají.",
            path: ["blocks"],
        });
        expect(override.success).toBe(false);
    });

    it("allows blocks that only touch, in any order", () => {
        expect(daySchema.safeParse({ dayOfWeek: 1, blocks: touching }).success).toBe(true);
        expect(
            dayOverrideSchema.safeParse({ date: "2026-10-20", blocks: touching }).success
        ).toBe(true);
    });
});
