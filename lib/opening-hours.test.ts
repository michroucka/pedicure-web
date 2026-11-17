import { describe, expect, it } from "vitest";
import { groupOpeningHours } from "@/lib/opening-hours";

describe("groupOpeningHours", () => {
    it("groups consecutive days with the same hours", () => {
        const blocks = [1, 2, 3, 4].map((dayOfWeek) => ({
            dayOfWeek,
            startTime: 480,
            endTime: 960,
        }));
        expect(groupOpeningHours(blocks)).toEqual([
            { days: "Po–Čt", hours: ["8:00–16:00"] },
        ]);
    });

    it("lists several blocks of a day in time order", () => {
        expect(
            groupOpeningHours([
                { dayOfWeek: 1, startTime: 780, endTime: 960 },
                { dayOfWeek: 1, startTime: 480, endTime: 720 },
            ])
        ).toEqual([{ days: "Po", hours: ["8:00–12:00", "13:00–16:00"] }]);
    });

    it("does not join days across a closed day", () => {
        const blocks = [1, 3].map((dayOfWeek) => ({
            dayOfWeek,
            startTime: 510,
            endTime: 900,
        }));
        expect(groupOpeningHours(blocks)).toEqual([
            { days: "Po", hours: ["8:30–15:00"] },
            { days: "St", hours: ["8:30–15:00"] },
        ]);
    });

    it("puts Sunday last and splits days with different hours", () => {
        expect(
            groupOpeningHours([
                { dayOfWeek: 0, startTime: 540, endTime: 720 },
                { dayOfWeek: 5, startTime: 480, endTime: 720 },
                { dayOfWeek: 6, startTime: 540, endTime: 720 },
            ])
        ).toEqual([
            { days: "Pá", hours: ["8:00–12:00"] },
            { days: "So–Ne", hours: ["9:00–12:00"] },
        ]);
    });

    it("returns nothing without any availability", () => {
        expect(groupOpeningHours([])).toEqual([]);
    });
});
