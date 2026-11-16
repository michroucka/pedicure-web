import { prisma } from "./prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import { sumServiceDurations } from "./service-duration";
import { endsAfterMidnight, getCzechToday } from "./utils";

// Used only for bookings created outside the normal availability-window
// flow (admin "vlastní čas"), where getAvailableSlots/computeGaps never
// run. Booking_no_overlap would reject an overlap at insert too, but this
// check runs first so the admin gets a clear message instead of a race
// error, and nothing (client update) happens before it.
async function hasOverlappingBooking(
    db: Prisma.TransactionClient,
    date: Date,
    start: number,
    end: number
): Promise<boolean> {
    const bookings = await db.booking.findMany({
        where: { date, status: "CONFIRMED" },
        select: { startTime: true, endTime: true },
    });

    return bookings.some((b) => start < b.endTime && end > b.startTime);
}

export type OutsideHoursSlotProblem = "past" | "pastMidnight" | "overlap";

// Returns the reason instead of throwing, because callers react
// differently: the move functions throw SlotUnavailableError, the admin
// action returns its own message.
export async function checkOutsideHoursSlot(
    date: Date,
    startTime: number,
    serviceIds: number[],
    extraMinutes: number,
    options: { db?: Prisma.TransactionClient } = {}
): Promise<OutsideHoursSlotProblem | null> {
    const db = options.db ?? prisma;

    if (date.getTime() < getCzechToday().getTime()) return "past";

    const services = await db.service.findMany({
        where: { id: { in: serviceIds } },
    });
    const duration = sumServiceDurations(serviceIds, services) + extraMinutes;

    // A custom time skips the availability windows, which are what
    // normally keeps a booking inside the day.
    if (endsAfterMidnight(startTime, duration)) return "pastMidnight";

    if (
        await hasOverlappingBooking(db, date, startTime, startTime + duration)
    ) {
        return "overlap";
    }

    return null;
}
