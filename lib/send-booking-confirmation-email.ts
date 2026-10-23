import { Resend } from "resend";
import { BUSINESS_INFO, EMAIL_FROM } from "@/lib/business-info.ts";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import {
    BookingConfirmationEmail,
    type BookingEmailVariant,
} from "@/emails/booking-confirmation.tsx";
import { formatTime } from "@/lib/utils.ts";
import { getBookingPersonName } from "@/lib/get-booking-person-name.ts";
import { prisma } from "@/lib/prisma.ts";
import type { Booking, Client, Service } from "@/lib/generated/prisma/client.ts";


const SUBJECTS: Record<BookingEmailVariant, string> = {
    created: "Potvrzení rezervace",
    moved: "Rezervace přesunuta",
};

type BookingForEmail = Booking & { client: Client; service: Service };

// One email per booking action, covering every person in it — a group
// booking shares one contact (and so one email), so all people/services are
// listed together rather than sending one email per person. The magic link
// always uses the first booking's cancelToken; on the manage page, a
// grouped booking is looked up and acted on as a whole via its groupId.
// `variant: "moved"` is sent after a reschedule with the new bookings — the
// only way the client gets a working link again (see the template).
export async function sendBookingConfirmationEmail(
    bookings: BookingForEmail[],
    variant: BookingEmailVariant = "created"
): Promise<void> {
    const email = bookings[0].client.email;
    if (!email) return;

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        console.error(
            "RESEND_API_KEY není nastaven, potvrzovací e-mail nebyl odeslán."
        );
        return;
    }

    const dateLabel = format(bookings[0].date, "d. MMMM yyyy", { locale: cs });
    const timeLabel = `${formatTime(bookings[0].startTime)} – ${formatTime(bookings.at(-1)!.endTime)}`;
    const manageUrl = `${BUSINESS_INFO.siteUrl}/rezervace/sprava/${bookings[0].cancelToken}`;

    try {
        const resend = new Resend(apiKey);
        await resend.emails.send({
            from: EMAIL_FROM,
            to: email,
            subject: SUBJECTS[variant],
            react: BookingConfirmationEmail({
                clientName: bookings[0].client.name,
                people: bookings.map((b) => ({
                    name: getBookingPersonName(b),
                    serviceName: b.service.name,
                })),
                dateLabel,
                timeLabel,
                manageUrl,
                variant,
            }),
        });
    } catch (error) {
        // The booking itself is already committed to the DB — a failed or
        // not-yet-configured email send (missing/invalid RESEND_API_KEY,
        // unverified domain) must not undo it or break the confirmation
        // redirect.
        console.error("Nepodařilo se odeslat potvrzovací e-mail:", error);
    }
}

// After a move (magic link or admin) — takes the ids of the newly created
// bookings, since the move functions return them without relations.
export async function sendBookingMovedEmail(bookingIds: string[]): Promise<void> {
    const bookings = await prisma.booking.findMany({
        where: { id: { in: bookingIds } },
        include: { client: true, service: true },
        orderBy: { startTime: "asc" },
    });
    if (bookings.length === 0) return;
    await sendBookingConfirmationEmail(bookings, "moved");
}
