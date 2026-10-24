"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma.ts";
import { requireAdmin } from "@/lib/require-admin.ts";
import { getBookingPersonName } from "@/lib/get-booking-person-name.ts";
import {
    diffDayBlocks,
    toRecurringRows,
    type TimeSlot,
} from "@/lib/availability.ts";
import { parseTime, toDateOnly, addUtcDays } from "@/lib/utils.ts";
import { dateStrSchema } from "@/lib/validation.ts";
import {
    availabilitySchema,
    blockedRangesSchema,
    dayOverrideSchema,
    closeRangeSchema,
    type AvailabilityFormData,
    type DayOverrideFormData,
    type CloseRangeFormData,
} from "./schema.ts";

export async function saveRecurringAvailability(data: AvailabilityFormData) {
    await requireAdmin();
    // The form validates with the same schema (zodResolver), so a failure
    // here is tampered input – nothing to show, just don't save it.
    const result = availabilitySchema.safeParse(data);
    if (!result.success) return;
    const parsed = result.data;

    // Touching blocks get merged into one row – see toRecurringRows.
    const rows = toRecurringRows(
        parsed.days.map((day) => ({
            dayOfWeek: day.dayOfWeek,
            blocks: day.blocks.map((block) => ({
                start: parseTime(block.startTime),
                end: parseTime(block.endTime),
            })),
        }))
    );

    await prisma.$transaction([
        prisma.recurringAvailability.deleteMany({}),
        prisma.recurringAvailability.createMany({ data: rows }),
    ]);

    revalidatePath("/dostupnost");
}

export type ExceptionConflict = {
    clientName: string;
    startTime: number;
    endTime: number;
};

// Bookings that would be orphaned by blocking the given ranges – checked
// before saving so the admin gets a chance to cancel/move them first
// instead of the exception silently leaving them scheduled outside the
// (new) available hours.
export async function checkDayOverrideConflicts(
    dateStr: string,
    blockedRanges: TimeSlot[]
): Promise<ExceptionConflict[]> {
    await requireAdmin();
    const parsedDateStr = dateStrSchema.safeParse(dateStr);
    const parsedRanges = blockedRangesSchema.safeParse(blockedRanges);
    // Invalid input = no conflicts to show; saveDayOverride validates the
    // actual save on its own.
    if (!parsedDateStr.success || !parsedRanges.success) return [];
    blockedRanges = parsedRanges.data;
    if (blockedRanges.length === 0) return [];

    const date = toDateOnly(new Date(parsedDateStr.data));

    const bookings = await prisma.booking.findMany({
        where: {
            date,
            status: "CONFIRMED",
            OR: blockedRanges.map((r) => ({
                startTime: { lt: r.end },
                endTime: { gt: r.start },
            })),
        },
        include: { client: true },
        orderBy: { startTime: "asc" },
    });

    return bookings.map((b) => ({
        clientName: getBookingPersonName(b),
        startTime: b.startTime,
        endTime: b.endTime,
    }));
}

// Replaces every exception on this date with whatever it takes to make the
// day's resolved hours match `blocks` exactly – the admin edits the target
// hours directly, not "block"/"extra open" deltas.
export async function saveDayOverride(
    data: DayOverrideFormData
): Promise<{ ok: true } | { ok: false; error: string }> {
    await requireAdmin();
    const result = dayOverrideSchema.safeParse(data);
    if (!result.success) {
        return {
            ok: false,
            error: result.error.issues[0]?.message ?? "Neplatná data.",
        };
    }
    const parsed = result.data;
    const date = toDateOnly(new Date(parsed.date));
    const dayOfWeek = date.getUTCDay();

    const recurringRows = await prisma.recurringAvailability.findMany({
        where: { dayOfWeek },
    });
    const recurring: TimeSlot[] = recurringRows.map((r) => ({
        start: r.startTime,
        end: r.endTime,
    }));

    const target: TimeSlot[] = parsed.blocks
        .map((b) => ({
            start: parseTime(b.startTime),
            end: parseTime(b.endTime),
        }))
        .sort((a, b) => a.start - b.start);

    await prisma.$transaction(async (tx) => {
        await tx.availabilityException.deleteMany({ where: { date } });

        if (target.length === 0) {
            // Nothing left open – if the day wasn't already closed by the
            // recurring schedule, that's a single whole-day block, same as
            // the old "BLOCKED_ALL_DAY" case.
            if (recurring.length > 0) {
                await tx.availabilityException.create({
                    data: {
                        date,
                        type: "BLOCKED",
                        startTime: null,
                        endTime: null,
                    },
                });
            }
            return;
        }

        const { blocked, extraOpen } = diffDayBlocks(recurring, target);

        await tx.availabilityException.createMany({
            data: [
                ...blocked.map((r) => ({
                    date,
                    type: "BLOCKED" as const,
                    startTime: r.start,
                    endTime: r.end,
                })),
                ...extraOpen.map((r) => ({
                    date,
                    type: "EXTRA_OPEN" as const,
                    startTime: r.start,
                    endTime: r.end,
                })),
            ],
        });
    });

    revalidatePath("/dostupnost");
    return { ok: true };
}

function datesInRange(startDateStr: string, endDateStr: string): Date[] {
    const start = toDateOnly(new Date(startDateStr));
    const end = toDateOnly(new Date(endDateStr));
    const dates: Date[] = [];
    for (let d = start; d.getTime() <= end.getTime(); d = addUtcDays(d, 1)) {
        dates.push(d);
    }
    return dates;
}

// Closing a range is always a full day block, so any CONFIRMED booking
// anywhere in the range is a conflict – no per-time-range overlap math
// needed like checkDayOverrideConflicts does for partial blocks.
export async function checkRangeConflicts(
    startDateStr: string,
    endDateStr: string
): Promise<ExceptionConflict[]> {
    await requireAdmin();
    // Same rules (incl. the max length) as saveCloseRange – an invalid
    // range shows no conflicts and then fails there with the message.
    const result = closeRangeSchema.safeParse({
        startDate: startDateStr,
        endDate: endDateStr,
    });
    if (!result.success) return [];
    const dates = datesInRange(result.data.startDate, result.data.endDate);

    const bookings = await prisma.booking.findMany({
        where: { date: { in: dates }, status: "CONFIRMED" },
        include: { client: true },
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });

    return bookings.map((b) => ({
        clientName: getBookingPersonName(b),
        startTime: b.startTime,
        endTime: b.endTime,
    }));
}

// Full-day BLOCKED exception on every date in the range, replacing whatever
// exceptions (if any) were already there – same "target state, not delta"
// convention as saveDayOverride, just for many days at once.
export async function saveCloseRange(
    data: CloseRangeFormData
): Promise<{ ok: true } | { ok: false; error: string }> {
    await requireAdmin();
    const result = closeRangeSchema.safeParse(data);
    if (!result.success) {
        return {
            ok: false,
            error: result.error.issues[0]?.message ?? "Neplatná data.",
        };
    }
    const dates = datesInRange(result.data.startDate, result.data.endDate);

    await prisma.$transaction([
        prisma.availabilityException.deleteMany({
            where: { date: { in: dates } },
        }),
        prisma.availabilityException.createMany({
            data: dates.map((date) => ({
                date,
                type: "BLOCKED" as const,
                startTime: null,
                endTime: null,
            })),
        }),
    ]);

    revalidatePath("/dostupnost");
    return { ok: true };
}
