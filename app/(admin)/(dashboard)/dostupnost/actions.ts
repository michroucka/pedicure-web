"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma.ts";
import { rangesOverlap } from "@/lib/availability.ts";
import { parseTime, toDateOnly } from "@/lib/utils.ts";
import {
    availabilitySchema,
    editExceptionSchema,
    exceptionSchema,
    type AvailabilityFormData,
    type EditExceptionFormData,
    type ExceptionFormData,
    type ExceptionKind,
} from "./schema.ts";

export async function saveRecurringAvailability(data: AvailabilityFormData) {
    const parsed = availabilitySchema.parse(data);

    const rows = parsed.days.flatMap((day) =>
        day.blocks.map((block) => ({
            dayOfWeek: day.dayOfWeek,
            startTime: parseTime(block.startTime),
            endTime: parseTime(block.endTime),
        }))
    );

    await prisma.$transaction([
        prisma.recurringAvailability.deleteMany({}),
        prisma.recurringAvailability.createMany({ data: rows }),
    ]);

    revalidatePath("/dostupnost");
}

// A day with a whole-day BLOCKED exception can't have anything else that
// day (nothing left to combine it with), and any two time ranges on the
// same day — BLOCKED_PARTIAL or EXTRA_OPEN, regardless of type — must be
// disjoint. That's what keeps resolveDayTimeSlots's fold order-independent:
// overlapping ranges would make the result depend on the (unspecified) DB
// fetch order of the exceptions.
async function validateNoOverlap(
    date: Date,
    kind: ExceptionKind,
    startTime: number | null,
    endTime: number | null,
    excludeId?: string
): Promise<string | null> {
    const existing = await prisma.availabilityException.findMany({
        where: { date, ...(excludeId ? { id: { not: excludeId } } : {}) },
    });

    if (kind === "BLOCKED_ALL_DAY") {
        if (existing.length > 0) {
            return "Pro tento den už existuje jiná výjimka – nejdřív ji smaž.";
        }
        return null;
    }

    const hasAllDayBlock = existing.some(
        (e) => e.type === "BLOCKED" && e.startTime === null
    );
    if (hasAllDayBlock) {
        return 'Tento den je celý zavřený – nejdřív smaž výjimku "Zavřeno celý den".';
    }

    const newRange = { start: startTime!, end: endTime! };
    const overlaps = existing.some(
        (e) =>
            e.startTime !== null &&
            e.endTime !== null &&
            rangesOverlap(newRange, { start: e.startTime, end: e.endTime })
    );
    if (overlaps) {
        return "Zvolený čas se překrývá s jinou výjimkou tento den.";
    }

    return null;
}

export async function createException(
    data: ExceptionFormData
): Promise<{ ok: true } | { ok: false; error: string }> {
    const parsed = exceptionSchema.parse(data);
    const date = toDateOnly(new Date(parsed.date));

    const startTime =
        parsed.kind === "BLOCKED_ALL_DAY" ? null : parseTime(parsed.startTime);
    const endTime =
        parsed.kind === "BLOCKED_ALL_DAY" ? null : parseTime(parsed.endTime);

    const error = await validateNoOverlap(date, parsed.kind, startTime, endTime);
    if (error) return { ok: false, error };

    await prisma.availabilityException.create({
        data: {
            date,
            type: parsed.kind === "EXTRA_OPEN" ? "EXTRA_OPEN" : "BLOCKED",
            startTime,
            endTime,
        },
    });

    revalidatePath("/dostupnost");
    return { ok: true };
}

export async function updateException(
    data: EditExceptionFormData
): Promise<{ ok: true } | { ok: false; error: string }> {
    const parsed = editExceptionSchema.parse(data);

    const existing = await prisma.availabilityException.findUniqueOrThrow({
        where: { id: parsed.id },
    });
    if (existing.startTime === null) {
        throw new Error("Celodenní výjimka nemá čas k úpravě.");
    }

    const startTime = parseTime(parsed.startTime);
    const endTime = parseTime(parsed.endTime);
    const kind: ExceptionKind =
        existing.type === "EXTRA_OPEN" ? "EXTRA_OPEN" : "BLOCKED_PARTIAL";

    const error = await validateNoOverlap(
        existing.date,
        kind,
        startTime,
        endTime,
        existing.id
    );
    if (error) return { ok: false, error };

    await prisma.availabilityException.update({
        where: { id: parsed.id },
        data: { startTime, endTime },
    });

    revalidatePath("/dostupnost");
    return { ok: true };
}

export async function deleteException(id: string) {
    await prisma.availabilityException.delete({ where: { id } });
    revalidatePath("/dostupnost");
}

export type ExceptionConflict = {
    clientName: string;
    startTime: number;
    endTime: number;
};

export async function checkExceptionConflicts(
    dateStr: string,
    startTime: number | null,
    endTime: number | null
): Promise<ExceptionConflict[]> {
    const date = toDateOnly(new Date(dateStr));

    const bookings = await prisma.booking.findMany({
        where: {
            date,
            status: "CONFIRMED",
            ...(startTime !== null && endTime !== null
                ? { startTime: { lt: endTime }, endTime: { gt: startTime } }
                : {}),
        },
        include: { client: true },
        orderBy: { startTime: "asc" },
    });

    return bookings.map((b) => ({
        clientName: b.client.name,
        startTime: b.startTime,
        endTime: b.endTime,
    }));
}
