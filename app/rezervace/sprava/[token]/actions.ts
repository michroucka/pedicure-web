"use server";

import { getBookingGroupByToken } from "@/lib/get-booking-group-by-token.ts";
import { cancelBooking, cancelGroupBooking } from "@/lib/cancel-booking.ts";
import {
    moveBooking,
    moveGroupBooking,
    SlotUnavailableError,
} from "@/lib/move-booking.ts";
import { canClientModifyBooking } from "@/lib/booking-modification-window.ts";
import { getAvailableSlots } from "@/lib/get-available-slots.ts";
import { getAvailableDaysInRange } from "@/lib/get-available-days-in-range.ts";
import { formatTime, toDateOnly } from "@/lib/utils.ts";
import { revalidatePath } from "next/cache";
import type { BookingWithRelations } from "@/lib/get-booking-group-by-token.ts";
import { after } from "next/server";
import { sendPushNotification } from "@/lib/send-push.ts";
import { sendBookingMovedEmail } from "@/lib/send-booking-confirmation-email.ts";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { dateRangeSchema } from "@/app/rezervace/schema.ts";
import { dateStrSchema, startTimeSchema } from "@/lib/validation.ts";
import { tokenSchema } from "./schema.ts";

const NOT_FOUND_ERROR = "Rezervace nebyla nalezena.";
const WINDOW_PASSED_ERROR =
    "Rezervaci už nelze online upravit – kontaktujte nás prosím telefonicky.";
const SLOT_TAKEN_ERROR = "Zvolený termín už není volný.";

function serviceContext(bookings: BookingWithRelations[]) {
    return {
        // The bookings being rescheduled — left out of the occupied set so
        // their own current slot shows as available (same as the admin
        // edit dialog's getMoveSlotsAction).
        bookingIds: bookings.map((b) => b.id),
        serviceIds: bookings.map((b) => b.serviceId),
        extraMinutes: bookings.reduce((sum, b) => sum + b.extraTimeMinutes, 0),
    };
}

// "Jana Nováková – 2 osoby" for a group, "Jana Nováková – Pedikúra klasik"
// for a solo booking — same shorthand convention as the push sent on
// booking creation (app/rezervace/actions.ts).
function pushSubjectLine(bookings: BookingWithRelations[]): string {
    return bookings.length > 1
        ? `${bookings[0].client.name} – ${bookings.length} osoby`
        : `${bookings[0].client.name} – ${bookings[0].service.name}`;
}

function formatDateTime(date: Date, startTime: number): string {
    return `${format(date, "d. MMMM yyyy", { locale: cs })} ${formatTime(startTime)}`;
}

export async function cancelBookingByTokenAction(
    token: string
): Promise<{ ok: true } | { ok: false; error: string }> {
    // An invalid token gets the same answer as an unknown one.
    if (!tokenSchema.safeParse(token).success) {
        return { ok: false, error: NOT_FOUND_ERROR };
    }

    const bookings = await getBookingGroupByToken(token);
    if (!bookings || bookings[0].status !== "CONFIRMED") {
        return { ok: false, error: NOT_FOUND_ERROR };
    }
    if (!canClientModifyBooking(bookings[0].date, bookings[0].startTime)) {
        return { ok: false, error: WINDOW_PASSED_ERROR };
    }

    if (bookings[0].groupId) {
        await cancelGroupBooking(bookings[0].groupId);
    } else {
        await cancelBooking(bookings[0].id);
    }

    after(() =>
        sendPushNotification({
            title:
                bookings.length > 1
                    ? "❌ Skupinová rezervace zrušena"
                    : "❌ Rezervace zrušena",
            body: `${pushSubjectLine(bookings)}, ${formatDateTime(bookings[0].date, bookings[0].startTime)}`,
            url: "/kalendar",
        })
    );

    revalidatePath(`/rezervace/sprava/${token}`);
    return { ok: true };
}

export async function getRescheduleDaysAction(
    token: string,
    range: { from: Date; to: Date }
): Promise<Date[]> {
    const parsedRange = dateRangeSchema.safeParse(range);
    if (!tokenSchema.safeParse(token).success || !parsedRange.success)
        return [];

    const bookings = await getBookingGroupByToken(token);
    if (!bookings || bookings[0].status !== "CONFIRMED") return [];

    const { bookingIds, serviceIds, extraMinutes } = serviceContext(bookings);
    return getAvailableDaysInRange(parsedRange.data, serviceIds, extraMinutes, {
        excludeBookingIds: bookingIds,
    });
}

export async function getRescheduleSlotsAction(
    token: string,
    dateStr: string
): Promise<number[]> {
    const parsedDateStr = dateStrSchema.safeParse(dateStr);
    if (!tokenSchema.safeParse(token).success || !parsedDateStr.success)
        return [];

    const bookings = await getBookingGroupByToken(token);
    if (!bookings || bookings[0].status !== "CONFIRMED") return [];

    const date = toDateOnly(new Date(parsedDateStr.data));
    const { bookingIds, serviceIds, extraMinutes } = serviceContext(bookings);

    return getAvailableSlots(date, serviceIds, extraMinutes, {
        excludeBookingIds: bookingIds,
    });
}

// Move = cancel + recreate (see lib/move-booking.ts), which means the new
// booking gets a brand new cancelToken — the client's old magic link stops
// working the moment the move succeeds. The caller must redirect to
// `/rezervace/sprava/${newToken}` on success so they keep a working link.
export async function moveBookingByTokenAction(
    token: string,
    dateStr: string,
    startTime: number
): Promise<{ ok: true; newToken: string } | { ok: false; error: string }> {
    if (!tokenSchema.safeParse(token).success) {
        return { ok: false, error: NOT_FOUND_ERROR };
    }
    // The picker only ever offers real slots — a malformed target is
    // tampering, answered the same as a slot that's no longer free.
    const parsedDateStr = dateStrSchema.safeParse(dateStr);
    if (
        !parsedDateStr.success ||
        !startTimeSchema.safeParse(startTime).success
    ) {
        return { ok: false, error: SLOT_TAKEN_ERROR };
    }

    const bookings = await getBookingGroupByToken(token);
    if (!bookings || bookings[0].status !== "CONFIRMED") {
        return { ok: false, error: NOT_FOUND_ERROR };
    }
    if (!canClientModifyBooking(bookings[0].date, bookings[0].startTime)) {
        return { ok: false, error: WINDOW_PASSED_ERROR };
    }

    const date = toDateOnly(new Date(parsedDateStr.data));

    // moveBooking/moveGroupBooking validate the target slot with
    // allowToday: true (admin is allowed to move bookings into today) — the
    // client-facing flow isn't, so that has to be checked here first,
    // against the same public rule getRescheduleSlotsAction already used to
    // offer slots in the first place.
    const { bookingIds, serviceIds, extraMinutes } = serviceContext(bookings);
    const validSlots = await getAvailableSlots(date, serviceIds, extraMinutes, {
        excludeBookingIds: bookingIds,
    });
    if (!validSlots.includes(startTime)) {
        return { ok: false, error: SLOT_TAKEN_ERROR };
    }

    try {
        if (bookings[0].groupId) {
            const moved = await moveGroupBooking(
                bookings[0].groupId,
                date,
                startTime
            );
            // The new bookings have new cancelTokens — the email is how the
            // client gets a working link again outside this browser tab.
            after(() => sendBookingMovedEmail(moved.map((b) => b.id)));
            after(() =>
                sendPushNotification({
                    title: "🔁 Skupinová rezervace přesunuta",
                    body: `${pushSubjectLine(bookings)}, ${formatDateTime(bookings[0].date, bookings[0].startTime)} → ${formatDateTime(date, startTime)}`,
                    url: "/kalendar",
                })
            );
            revalidatePath(`/rezervace/sprava/${token}`);
            return { ok: true, newToken: moved[0].cancelToken };
        }

        const moved = await moveBooking(bookings[0].id, date, startTime);
        after(() => sendBookingMovedEmail([moved.id]));
        after(() =>
            sendPushNotification({
                title: "🔁 Rezervace přesunuta",
                body: `${pushSubjectLine(bookings)}, ${formatDateTime(bookings[0].date, bookings[0].startTime)} → ${formatDateTime(date, startTime)}`,
                url: "/kalendar",
            })
        );
        revalidatePath(`/rezervace/sprava/${token}`);
        return { ok: true, newToken: moved.cancelToken };
    } catch (error) {
        if (error instanceof SlotUnavailableError) {
            return { ok: false, error: error.message };
        }
        throw error;
    }
}
