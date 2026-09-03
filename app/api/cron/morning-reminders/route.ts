import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.ts";
import { getCzechToday, formatTime } from "@/lib/utils.ts";
import { sendSms, getSmsCreditCzk } from "@/lib/sms.ts";
import { sendLowCreditAlertEmail } from "@/lib/send-low-credit-alert-email.ts";
import type { Booking, Client } from "@/lib/generated/prisma/client.ts";

type BookingForReminder = Booking & { client: Client };

const SIGNATURE = "Nohy v cajku - Pedikura Kralovice";

// Constant in code, not a DB field — same convention as
// canClientModifyBooking's 24h window (see lib/booking-modification-window.ts).
const LOW_CREDIT_THRESHOLD_CZK = 100;

// Deliberately plain ASCII, no diacritics, no per-service/per-client
// breakdown — Czech diacritics force UCS-2 encoding, which drops the
// per-segment SMS limit from 160 to 70 chars. Without diacritics this stays
// a single GSM-7 segment (~115 chars) no matter how many people are in a
// group booking, instead of silently splitting into 2-3 billed segments.
function buildReminderMessage(bookings: BookingForReminder[]): string {
    const startTime = formatTime(bookings[0].startTime);

    return `Dobry den, pripominam Vam dnesni rezervaci na pedikuru od ${startTime}. Tesim se na Vas! ${SIGNATURE}`;
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
        include: { client: true },
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

    // Checked once per cron run (not per SMS) — plenty granular for
    // catching a draining balance before reminders start silently failing.
    // TODO: once Web Push is built (see project roadmap), also send a push
    // notification here alongside the email — don't rely on email alone.
    const creditCzk = await getSmsCreditCzk();
    if (creditCzk !== null && creditCzk < LOW_CREDIT_THRESHOLD_CZK) {
        await sendLowCreditAlertEmail(creditCzk);
    }

    return NextResponse.json({ groups: groups.size, sent: sentCount });
}
