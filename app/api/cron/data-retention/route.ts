import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.ts";
import { getCzechToday } from "@/lib/utils.ts";
import { getExpiredClientIds } from "@/lib/data-retention.ts";
import { verifyCronRequest } from "@/lib/verify-cron-request.ts";

// Deletes clients (with all their bookings) that are past the retention
// period promised in the privacy policy. Runs monthly via Vercel Cron
// (auth in verifyCronRequest).
// Deleted for good, not anonymized — booking history isn't used for anything
// that would justify keeping it.
export async function GET(request: NextRequest) {
    const unauthorizedResponse = verifyCronRequest(request);
    if (unauthorizedResponse) return unauthorizedResponse;

    // Hidden clients (active: false) included on purpose — they're exactly
    // the ones kept only for history and waiting for this cleanup.
    const clients = await prisma.client.findMany({
        select: {
            id: true,
            createdAt: true,
            bookings: {
                select: { date: true, status: true, createdAt: true },
            },
        },
    });

    const expiredIds = getExpiredClientIds(clients, getCzechToday());

    // Deliberately no re-check between the read above and the delete: a
    // booking made in that window for a client expired by 3+ years would be
    // deleted too. The cron runs once a month at 3 AM, not worth the extra
    // complexity.
    // Bookings first — Booking.clientId is a required FK without cascade.
    const [deletedBookings, deletedClients] = await prisma.$transaction([
        prisma.booking.deleteMany({ where: { clientId: { in: expiredIds } } }),
        prisma.client.deleteMany({ where: { id: { in: expiredIds } } }),
    ]);

    // Counts only — logging names/phones would keep the very data we just
    // deleted around in Vercel logs.
    console.log(
        `Data retention: deleted ${deletedClients.count} clients, ${deletedBookings.count} bookings`
    );

    return NextResponse.json({
        clients: deletedClients.count,
        bookings: deletedBookings.count,
    });
}
