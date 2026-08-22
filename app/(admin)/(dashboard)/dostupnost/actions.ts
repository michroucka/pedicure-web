"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma.ts";
import { parseTime, toDateOnly } from "@/lib/utils.ts";
import {
    availabilitySchema,
    exceptionSchema,
    type AvailabilityFormData,
    type ExceptionFormData,
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

export async function createException(data: ExceptionFormData) {
    const parsed = exceptionSchema.parse(data);
    const date = toDateOnly(new Date(parsed.date));

    await prisma.availabilityException.create({
        data:
            parsed.kind === "BLOCKED_ALL_DAY"
                ? { date, type: "BLOCKED", startTime: null, endTime: null }
                : {
                      date,
                      type:
                          parsed.kind === "EXTRA_OPEN"
                              ? "EXTRA_OPEN"
                              : "BLOCKED",
                      startTime: parseTime(parsed.startTime),
                      endTime: parseTime(parsed.endTime),
                  },
    });

    revalidatePath("/dostupnost");
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
