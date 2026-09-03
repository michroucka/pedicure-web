import { NextRequest, NextResponse } from "next/server";
import { addUtcDays, getCzechToday } from "@/lib/utils.ts";
import { prisma } from "@/lib/prisma.ts";
import { generateIcsFeed } from "@/lib/generate-ics-feed.ts";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ token: string }> }
) {
    const { token: rawToken } = await params;
    const token = rawToken.replace(/\.ics$/, "");

    if (!process.env.ICS_FEED_TOKEN || token !== process.env.ICS_FEED_TOKEN) {
        return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    const from = addUtcDays(getCzechToday(), -3);
    const bookings = await prisma.booking.findMany({
        where: {
            status: "CONFIRMED",
            date: { gte: from },
        },
        include: { client: true, service: true },
        orderBy: { date: "asc" },
    });

    const ics = generateIcsFeed(bookings);

    return new NextResponse(ics, {
        headers: {
            "Content-Type": "text/calendar; charset=utf-8",
            "Content-Disposition": 'attachment; filename="rezervace.ics"',
        },
    });
}
