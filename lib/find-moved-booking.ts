import { prisma } from "./prisma";
import { getBookingGroupByToken } from "./get-booking-group-by-token";

// A booking can be moved more than once (old -> new -> newer); a stale link
// shouldn't loop forever on corrupt data, so the chain is capped.
const MAX_MOVES_FOLLOWED = 20;

// For a booking cancelled by a move, returns the group it lives on as now
// (following every later move), or null when it was really cancelled - or
// when where it ended up has itself been cancelled since.
export async function findMovedBookingGroup(bookingId: string) {
    let current = await prisma.booking.findUnique({
        where: { id: bookingId },
        select: { movedToId: true },
    });

    for (let i = 0; i < MAX_MOVES_FOLLOWED && current?.movedToId; i++) {
        const next = await prisma.booking.findUnique({
            where: { id: current.movedToId },
            select: { status: true, movedToId: true, cancelToken: true },
        });
        if (next?.status === "CONFIRMED") {
            return getBookingGroupByToken(next.cancelToken);
        }
        current = next;
    }

    return null;
}
