import { prisma } from "./prisma.ts";
import { toDateOnly, getCzechToday, getCzechNowMinutes } from "./utils.ts";
import {
    computeAvailableSlots,
    resolveDayTimeSlots,
    type Exception,
    type TimeSlot,
} from "./availability.ts";
import type { Prisma, Service } from "@/lib/generated/prisma/client";

export async function getAvailableSlots(
    date: Date,
    serviceIds: number[],
    extraMinutes: number = 0,
    options: {
        // Public booking flow requires next-day minimum lead time; admin
        // actions (manual add, move) may book/move into today.
        allowToday?: boolean;
        db?: Prisma.TransactionClient;
    } = {}
): Promise<number[]> {
    const db = options.db ?? prisma;

    const services: Service[] = await db.service.findMany({
        where: { id: { in: serviceIds } },
    });

    const minServiceDuration = await db.service.aggregate({
        where: { active: true },
        _min: { durationMinutes: true },
    });

    const day = toDateOnly(date);
    const today = getCzechToday();

    if (options.allowToday) {
        if (day.getTime() < today.getTime()) return [];
    } else {
        if (day.getTime() <= today.getTime()) return [];
    }

    const dayOfWeek = day.getUTCDay();

    const [recurring, exceptions, bookings] = await Promise.all([
        db.recurringAvailability.findMany({
            where: { dayOfWeek },
        }),
        db.availabilityException.findMany({
            where: { date: day },
        }),
        db.booking.findMany({
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

    const serviceDuration =
        services.reduce((sum, s) => sum + s.durationMinutes, 0) + extraMinutes;

    const result = computeAvailableSlots(
        dayWindows,
        bookedSlots,
        serviceDuration,
        minServiceDuration._min.durationMinutes ?? serviceDuration
    );

    if (options.allowToday && day.getTime() === today.getTime()) {
        const nowMinutes = getCzechNowMinutes();
        return result.filter((s) => s >= nowMinutes);
    }

    return result;
}
