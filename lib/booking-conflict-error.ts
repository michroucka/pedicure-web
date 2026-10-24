import { Prisma } from "@/lib/generated/prisma/client.ts";

// Postgres SQLSTATE for an exclusion constraint violation (Booking_no_overlap).
const EXCLUSION_VIOLATION = "23P01";

// True when the DB refused a booking because its slot overlaps another
// CONFIRMED booking (Booking_no_overlap) – a race the application-level
// availability check can't see. Prisma doesn't know exclusion
// constraints, so with the pg driver adapter it surfaces as a generic
// P2039 carrying the original Postgres code.
export function isBookingSlotConflict(error: unknown): boolean {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;

    const meta = error.meta as
        { driverAdapterError?: { cause?: { code?: string } } } | undefined;
    return meta?.driverAdapterError?.cause?.code === EXCLUSION_VIOLATION;
}
