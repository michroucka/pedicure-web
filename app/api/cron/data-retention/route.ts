import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.ts";
import { getCzechToday } from "@/lib/utils.ts";
import { getExpiredClientIds } from "@/lib/data-retention.ts";

// Deletes clients (with all their bookings) that are past the retention
// period promised in the privacy policy. Runs monthly via Vercel Cron, with
// the same `Authorization: Bearer $CRON_SECRET` check as morning-reminders.
// Deleted for good, not anonymized — booking history isn't used for anything
// that would justify keeping it.
export async function GET(request: NextRequest) {
    if (!process.env.CRON_SECRET) {
        console.error("CRON_SECRET env var not set");
        return NextResponse.json(
            { error: "Server misconfigured" },
            { status: 500 }
        );
    }

    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
