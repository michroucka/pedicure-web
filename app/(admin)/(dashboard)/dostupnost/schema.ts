import { z } from "zod";

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
    dayOfWeek: z.number().min(0).max(6),
    blocks: z.array(blockSchema),
});

export const availabilitySchema = z.object({
    days: z.array(daySchema).length(7),
});

export type AvailabilityFormData = z.infer<typeof availabilitySchema>;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// The day-override editor works with the day's *target* open blocks
// directly (see lib/availability.ts's diffDayBlocks for how that gets
// translated into BLOCKED/EXTRA_OPEN exceptions on save) — same block
// shape as the recurring schedule, just for one specific date. An empty
// `blocks` array means "closed all day".
export const dayOverrideSchema = z
    .object({
        date: z.string().regex(DATE_RE),
        blocks: z.array(blockSchema),
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
