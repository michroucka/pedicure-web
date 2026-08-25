import { Resend } from "resend";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { BookingConfirmationEmail } from "@/emails/booking-confirmation.tsx";
import { formatTime } from "@/lib/utils.ts";
import type { Booking, Client, Service } from "@/lib/generated/prisma/client.ts";

const FROM_EMAIL = "Pedikúra Kralovice <rezervace@pedikurakralovice.cz>";
const BASE_URL = "https://www.pedikurakralovice.cz";

type BookingForEmail = Booking & { client: Client; service: Service };

// One email per booking action, covering every person in it — a group
// booking shares one contact (and so one email), so all people/services are
// listed together rather than sending one email per person. The magic link
// always uses the first booking's cancelToken; on the manage page, a
// grouped booking is looked up and acted on as a whole via its groupId.
export async function sendBookingConfirmationEmail(
    bookings: BookingForEmail[]
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
    const timeLabel = `${formatTime(bookings[0].startTime)}–${formatTime(bookings.at(-1)!.endTime)}`;
    const manageUrl = `${BASE_URL}/rezervace/sprava/${bookings[0].cancelToken}`;

    try {
        const resend = new Resend(apiKey);
        await resend.emails.send({
            from: FROM_EMAIL,
            to: email,
            subject: "Potvrzení rezervace – Pedikúra Kralovice",
            react: BookingConfirmationEmail({
                clientName: bookings[0].client.name,
                people: bookings.map((b) => ({
                    name: b.client.name,
                    serviceName: b.service.name,
                })),
                dateLabel,
                timeLabel,
                manageUrl,
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
