import { prisma } from "./prisma.ts";
import { toDateOnly, getCzechToday } from "./utils.ts";
import {
    computeAvailableSlots,
    resolveDayTimeSlots,
    type Exception,
    type TimeSlot,
} from "./availability.ts";
const DAY_MS = 24 * 60 * 60 * 1000;

export async function getAvailableDaysInRange(
    range: { from: Date; to: Date },
    serviceIds: number[],
    extraMinutes: number = 0
): Promise<Date[]> {
    const from = toDateOnly(range.from);
    const to = toDateOnly(range.to);

    const [services, minServiceDuration, recurring, exceptions, bookings] =
        await Promise.all([
            prisma.service.findMany({
                where: { id: { in: serviceIds } },
            }),
            prisma.service.aggregate({
                where: { active: true },
                _min: { durationMinutes: true },
            }),
            prisma.recurringAvailability.findMany(),
            prisma.availabilityException.findMany({
                where: { date: { gte: from, lte: to } },
            }),
            prisma.booking.findMany({
                where: { date: { gte: from, lte: to }, status: "CONFIRMED" },
            }),
        ]);

    const recurringByDayOfWeek = new Map<number, TimeSlot[]>();
    for (const r of recurring) {
        const existing = recurringByDayOfWeek.get(r.dayOfWeek) ?? [];
        existing.push({ start: r.startTime, end: r.endTime });
        recurringByDayOfWeek.set(r.dayOfWeek, existing);
    }

    const exceptionsByDay = new Map<number, Exception[]>();
    for (const e of exceptions) {
        const key = e.date.getTime();
        const existing = exceptionsByDay.get(key) ?? [];
        existing.push({ type: e.type, start: e.startTime, end: e.endTime });
        exceptionsByDay.set(key, existing);
    }

    const bookingsByDay = new Map<number, TimeSlot[]>();
    for (const b of bookings) {
        const key = b.date.getTime();
        const existing = bookingsByDay.get(key) ?? [];
        existing.push({ start: b.startTime, end: b.endTime });
        bookingsByDay.set(key, existing);
    }

    const serviceDuration =
        services.reduce((sum, s) => sum + s.durationMinutes, 0) +
        extraMinutes;

    const availableDays: Date[] = [];
    const czechToday = getCzechToday();

    for (let t = from.getTime(); t <= to.getTime(); t += DAY_MS) {
        const dayOnly = new Date(t);
        if (dayOnly.getTime() <= czechToday.getTime()) continue;

        const dayOfWeek = dayOnly.getUTCDay();
        const key = dayOnly.getTime();

        const dayWindows = resolveDayTimeSlots(
            recurringByDayOfWeek.get(dayOfWeek) ?? [],
            exceptionsByDay.get(key) ?? []
        );

        const slots = computeAvailableSlots(
            dayWindows,
            bookingsByDay.get(key) ?? [],
            serviceDuration,
            minServiceDuration._min.durationMinutes ?? serviceDuration
        );

        if (slots.length > 0) {
            availableDays.push(dayOnly);
        }
    }

    return availableDays;
}
