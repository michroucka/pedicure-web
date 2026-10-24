import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.ts";
import { getCzechToday, formatTime, stripDiacritics } from "@/lib/utils.ts";
import { BUSINESS_INFO } from "@/lib/business-info.ts";
import { verifyCronRequest } from "@/lib/verify-cron-request.ts";
import { sendSms, getSmsCreditCzk } from "@/lib/sms.ts";
import { sendLowCreditAlertEmail } from "@/lib/send-low-credit-alert-email.ts";
import type { Booking, Client } from "@/lib/generated/prisma/client.ts";
import { sendPushNotification } from "@/lib/send-push.ts";

type BookingForReminder = Booking & { client: Client };

// SMS text stays diacritics-free (GSM-7 fits 160 chars per part, Unicode
// only 70), so the brand from BUSINESS_INFO gets stripped too.
const SIGNATURE = stripDiacritics(
    `${BUSINESS_INFO.name} - ${BUSINESS_INFO.tagline}`,
);

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

// "Dnes máš 1 klienta / 3 klienty / 5 klientů" - counts people, so a group
// booking adds each member.
function clientsWord(count: number): string {
    if (count === 1) return "klienta";
    if (count >= 2 && count <= 4) return "klienty";
    return "klientů";
}

// Vercel Cron GETs this daily (auth in verifyCronRequest).
export async function GET(request: NextRequest) {
    const unauthorizedResponse = verifyCronRequest(request);
    if (unauthorizedResponse) return unauthorizedResponse;

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
        const phone = group[0].client.phone;
        // No phone on file (e.g. an in-person booking taken without one) —
        // nothing to text, skip. Doesn't need reminderSent tracking either:
        // this cron only ever looks at today's date, so there's no later
        // run that would retry it.
        if (!phone) continue;

        const sent = await sendSms(phone, buildReminderMessage(group));
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
    const creditCzk = await getSmsCreditCzk();
    if (creditCzk !== null && creditCzk < LOW_CREDIT_THRESHOLD_CZK) {
        await sendLowCreditAlertEmail(creditCzk);
        await sendPushNotification({
            title: "⚠️ Nízký kredit SMS brány",
            body: `Zůstatek na SMSManager.cz klesl na ${creditCzk.toFixed(2)} Kč. Doplňte prosím kredit.`,
            url: "/kalendar",
        });
    }

    const todaysBookings = await prisma.booking.findMany({
        where: { date: today, status: "CONFIRMED" },
        orderBy: { startTime: "asc" },
    });

    await sendPushNotification({
        title: "🗓️ Dnešní rozpis",
        body:
            todaysBookings.length === 0
                ? "Dnes máš volno! 🎉"
                : `Dnes máš ${todaysBookings.length} ${clientsWord(todaysBookings.length)} od ${formatTime(todaysBookings[0].startTime)} do ${formatTime(todaysBookings[todaysBookings.length - 1].endTime)}`,
        url: "/kalendar",
    });

    return NextResponse.json({ groups: groups.size, sent: sentCount });
}
