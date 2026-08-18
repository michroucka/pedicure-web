import { prisma } from "./prisma.ts";
import { toDateOnly, getCzechToday } from "./utils.ts";
import {
    computeAvailableSlots,
    resolveDayTimeSlots,
    type Exception,
    type TimeSlot,
} from "./availability.ts";
import type { Service } from "@/lib/generated/prisma/client";

export async function getAvailableSlots(
    date: Date,
    serviceIds: number[],
    extraMinutes: number = 0
): Promise<number[]> {
    const services: Service[] = await prisma.service.findMany({
        where: { id: { in: serviceIds } },
    });

    const minServiceDuration = await prisma.service.aggregate({
        where: { active: true },
        _min: { durationMinutes: true },
    });

    const day = toDateOnly(date);

    if (day.getTime() <= getCzechToday().getTime()) {
        return [];
    }

    const dayOfWeek = day.getUTCDay();

    const [recurring, exceptions, bookings] = await Promise.all([
        prisma.recurringAvailability.findMany({
            where: { dayOfWeek },
        }),
        prisma.availabilityException.findMany({
            where: { date: day },
        }),
        prisma.booking.findMany({
            where: { date: day, status: "CONFIRMED" },
        }),
    ]);

    const recurringWindows: TimeSlot[] = recurring.map((r) => ({
        start: r.startTime,
        end: r.endTime,
    }));

    const exceptionRanges: Exception[] = exceptions.map((e) => ({
        type: e.type,
        start: e.startTime,
        end: e.endTime,
    }));

    const bookedSlots: TimeSlot[] = bookings.map((b) => ({
        start: b.startTime,
        end: b.endTime,
    }));

    const dayWindows = resolveDayTimeSlots(recurringWindows, exceptionRanges);

    const serviceDuration = services.reduce(
        (sum, s) => sum + s.durationMinutes,
        0
    ) + extraMinutes;

    return computeAvailableSlots(
        dayWindows,
        bookedSlots,
        serviceDuration,
        minServiceDuration._min.durationMinutes ?? serviceDuration
    );
}
