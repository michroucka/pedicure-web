import { Prisma } from "@/lib/generated/prisma/client.ts";

// Postgres SQLSTATE for an exclusion constraint violation (Booking_no_overlap).
const EXCLUSION_VIOLATION = "23P01";

// True when the DB refused a booking because its slot is taken by another
// CONFIRMED booking – a race the application-level availability check
// can't see. Two constraints can fire:
// - P2002: the partial unique (date, startTime) index
// - Booking_no_overlap: Prisma doesn't know exclusion constraints, so with
//   the pg driver adapter it surfaces as a generic P2039 carrying the
//   original Postgres code
export function isBookingSlotConflict(error: unknown): boolean {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
    if (error.code === "P2002") return true;

    const meta = error.meta as
        { driverAdapterError?: { cause?: { code?: string } } } | undefined;
    return meta?.driverAdapterError?.cause?.code === EXCLUSION_VIOLATION;
}
