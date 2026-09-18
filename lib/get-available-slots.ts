import { prisma } from "./prisma.ts";
import { toDateOnly, getCzechToday, getCzechNowMinutes } from "./utils.ts";
import {
    computeAvailableSlots,
    resolveDayTimeSlots,
    type Exception,
    type TimeSlot,
} from "./availability.ts";
import type { Prisma } from "@/lib/generated/prisma/client";

export async function getAvailableSlots(
    date: Date,
    serviceIds: number[],
    extraMinutes: number = 0,
    options: {
        // Public booking flow requires next-day minimum lead time; admin
        // actions (manual add, move) may book/move into today.
        allowToday?: boolean;
        db?: Prisma.TransactionClient;
        // Bookings to leave out of the "already occupied" set — the edit
        // dialog's slot preview needs this so a booking's own current slot
        // doesn't show up as unavailable to itself. The real move/update
        // path doesn't need this: it cancels the booking first, inside the
        // same transaction, before ever calling this function.
        excludeBookingIds?: string[];
    } = {}
): Promise<number[]> {
    const db = options.db ?? prisma;

    const day = toDateOnly(date);
    const today = getCzechToday();

    if (options.allowToday) {
        if (day.getTime() < today.getTime()) return [];
    } else {
        if (day.getTime() <= today.getTime()) return [];
    }

    const dayOfWeek = day.getUTCDay();

    const [services, minServiceDuration, recurring, exceptions, bookings] =
        await Promise.all([
            db.service.findMany({
                where: { id: { in: serviceIds } },
            }),
            db.service.aggregate({
                where: { active: true },
                _min: { durationMinutes: true },
            }),
            db.recurringAvailability.findMany({
                where: { dayOfWeek },
            }),
            db.availabilityException.findMany({
                where: { date: day },
            }),
            db.booking.findMany({
                where: {
                    date: day,
                    status: "CONFIRMED",
                    id: { notIn: options.excludeBookingIds ?? [] },
                },
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
