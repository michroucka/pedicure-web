import { prisma } from "./prisma.ts";
import type { Prisma } from "@/lib/generated/prisma/client.ts";

// Used only for bookings created outside the normal availability-window
// flow (admin "vlastní čas"), where getAvailableSlots/computeGaps never
// run — this is the only thing standing between two overlapping bookings,
// since the DB unique constraint on (date, startTime) only catches an
// exact-match collision, not a range overlap.
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
