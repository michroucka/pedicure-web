import { prisma } from "./prisma.ts";
import type { Booking, Client, Service } from "@/lib/generated/prisma/client.ts";

export type BookingWithRelations = Booking & { client: Client; service: Service };

// A magic link always carries one booking's cancelToken, but when that
// booking is part of a group (groupId set), the client manages the whole
// group as a unit — same convention as moveGroupBooking/cancelGroupBooking.
// Returns bookings sorted by startTime, or null if the token doesn't match
// any booking.
export async function getBookingGroupByToken(
    token: string
): Promise<BookingWithRelations[] | null> {
    const booking = await prisma.booking.findUnique({
        where: { cancelToken: token },
        include: { client: true, service: true },
    });
    if (!booking) return null;
    if (!booking.groupId) return [booking];

    return prisma.booking.findMany({
        where: { groupId: booking.groupId },
        include: { client: true, service: true },
        orderBy: { startTime: "asc" },
    });
}
