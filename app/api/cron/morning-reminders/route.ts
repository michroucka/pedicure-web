import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.ts";
import { getCzechToday, formatTime } from "@/lib/utils.ts";
import { sendSms } from "@/lib/sms.ts";
import type { Booking, Client, Service } from "@/lib/generated/prisma/client.ts";

type BookingForReminder = Booking & { client: Client; service: Service };

const SIGNATURE = "Těším se na Vás! Nohy v cajku – Pedikúra Kralovice";

// Written with diacritics on purpose, at the cost of a second SMS segment
// (Czech diacritics force UCS-2 encoding, dropping the per-segment limit
// from 160 to 70 chars) — a warmer, personal tone matters more here than
// the extra segment cost for a solo practitioner's daily volume.
function buildReminderMessage(bookings: BookingForReminder[]): string {
    const startTime = formatTime(bookings[0].startTime);

    if (bookings.length === 1) {
        return `Dobrý den, připomínám Vám dnešní rezervaci na pedikúru - ${bookings[0].service.name} v ${startTime}. ${SIGNATURE}`;
    }

    const people = bookings
        .map((b) => `${b.client.name} (${b.service.name})`)
        .join(", ");
    return `Dobrý den, připomínám Vám dnešní rezervace od ${startTime} - ${people}. ${SIGNATURE}`;
}

// Vercel Cron GETs this daily with `Authorization: Bearer $CRON_SECRET`
// (set automatically once the CRON_SECRET env var exists on the project).
export async function GET(request: NextRequest) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = getCzechToday();
    const bookings = await prisma.booking.findMany({
        where: { date: today, status: "CONFIRMED", reminderSent: false },
        include: { client: true, service: true },
        orderBy: { startTime: "asc" },
    });

    // A group booking shares one contact/phone — one SMS per group, not
    // per person, same convention as the confirmation email.
    const groups = new Map<string, BookingForReminder[]>();
    for (const booking of bookings) {
        const key = booking.groupId ?? booking.id;
        const group = groups.get(key) ?? [];
        group.push(booking);
        groups.set(key, group);
    }

    let sentCount = 0;
    for (const group of groups.values()) {
        const sent = await sendSms(
            group[0].client.phone,
            buildReminderMessage(group)
        );
        if (sent) {
            await prisma.booking.updateMany({
                where: { id: { in: group.map((b) => b.id) } },
                data: { reminderSent: true },
            });
            sentCount++;
        }
    }

    return NextResponse.json({ groups: groups.size, sent: sentCount });
}
