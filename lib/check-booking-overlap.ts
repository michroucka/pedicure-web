import { prisma } from "./prisma.ts";
import type { Prisma } from "@/lib/generated/prisma/client.ts";

// Used only for bookings created outside the normal availability-window
// flow (admin "vlastní čas"), where getAvailableSlots/computeGaps never
// run. Booking_no_overlap would reject an overlap at insert too, but this
// check runs first so the admin gets a clear message instead of a race
// error, and nothing (client update) happens before it.
export async function hasOverlappingBooking(
    date: Date,
    start: number,
    end: number,
    options: { db?: Prisma.TransactionClient } = {}
): Promise<boolean> {
    const db = options.db ?? prisma;

    const bookings = await db.booking.findMany({
        where: { date, status: "CONFIRMED" },
        select: { startTime: true, endTime: true },
    });

    return bookings.some((b) => start < b.endTime && end > b.startTime);
}
