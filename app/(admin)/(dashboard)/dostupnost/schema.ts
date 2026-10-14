import { z } from "zod";
import { dateStrSchema } from "@/lib/validation.ts";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export const blockSchema = z
    .object({
        startTime: z.string().regex(TIME_RE, "Neplatný čas"),
        endTime: z.string().regex(TIME_RE, "Neplatný čas"),
    })
    .refine((b) => b.startTime < b.endTime, {
        message: "Konec musí být po začátku",
        path: ["endTime"],
    });

export const daySchema = z.object({
    dayOfWeek: z.int().min(0).max(6),
    blocks: z.array(blockSchema).max(10),
});

export const availabilitySchema = z.object({
    days: z.array(daySchema).length(7),
});

export type AvailabilityFormData = z.infer<typeof availabilitySchema>;

// The day-override editor works with the day's *target* open blocks
// directly (see lib/availability.ts's diffDayBlocks for how that gets
// translated into BLOCKED/EXTRA_OPEN exceptions on save) — same block
// shape as the recurring schedule, just for one specific date. An empty
// `blocks` array means "closed all day".
export const dayOverrideSchema = z
    .object({
        date: dateStrSchema,
        blocks: z.array(blockSchema).max(10),
    })
    .refine(
        (d) => {
            const sorted = [...d.blocks].sort((a, b) =>
                a.startTime.localeCompare(b.startTime)
            );
            return sorted.every(
                (b, i) => i === 0 || b.startTime >= sorted[i - 1].endTime
            );
        },
        { message: "Bloky se překrývají.", path: ["blocks"] }
    );

export type DayOverrideFormData = z.infer<typeof dayOverrideSchema>;

const MAX_CLOSE_RANGE_DAYS = 366;

// Bulk "close every day in this range" — always a full-day block, no time
// blocks to configure (unlike dayOverrideSchema's per-block editing).
export const closeRangeSchema = z
    .object({
        startDate: dateStrSchema,
        endDate: dateStrSchema,
    })
    .refine((d) => d.startDate <= d.endDate, {
        message: "Konec rozsahu musí být po jeho začátku.",
        path: ["endDate"],
    })
    // One exception row per day gets written — keeps a mistyped year from
    // creating thousands of them (and checkRangeConflicts from loading
    // every booking in that span).
    .refine(
        (d) =>
            new Date(d.endDate).getTime() - new Date(d.startDate).getTime() <=
            MAX_CLOSE_RANGE_DAYS * 24 * 60 * 60 * 1000,
        { message: "Rozsah může mít nejvýš rok.", path: ["endDate"] }
    );

export type CloseRangeFormData = z.infer<typeof closeRangeSchema>;

// Ranges diffDayBlocks computed in the browser — minutes since midnight.
export const blockedRangesSchema = z
    .array(
        z.object({
            start: z.int().min(0).max(1440),
            end: z.int().min(0).max(1440),
        })
    )
    .max(20);
