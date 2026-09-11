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
import { format } from "date-fns";
import { cs } from "date-fns/locale";

const NOT_FOUND_ERROR = "Rezervace nebyla nalezena.";
const WINDOW_PASSED_ERROR =
    "Rezervaci už nelze online upravit – kontaktujte nás prosím telefonicky.";

function serviceContext(bookings: BookingWithRelations[]) {
    return {
        serviceIds: bookings.map((b) => b.serviceId),
        extraMinutes: bookings.reduce(
            (sum, b) => sum + b.client.extraTimeMinutes,
            0
        ),
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
    const bookings = await getBookingGroupByToken(token);
    if (!bookings || bookings[0].status !== "CONFIRMED") return [];

    const { serviceIds, extraMinutes } = serviceContext(bookings);
    return getAvailableDaysInRange(range, serviceIds, extraMinutes);
}

export async function getRescheduleSlotsAction(
    token: string,
    dateStr: string
): Promise<number[]> {
    const bookings = await getBookingGroupByToken(token);
    if (!bookings || bookings[0].status !== "CONFIRMED") return [];

    const date = toDateOnly(new Date(dateStr));
    const { serviceIds, extraMinutes } = serviceContext(bookings);

    return getAvailableSlots(date, serviceIds, extraMinutes);
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
    const bookings = await getBookingGroupByToken(token);
    if (!bookings || bookings[0].status !== "CONFIRMED") {
        return { ok: false, error: NOT_FOUND_ERROR };
    }
    if (!canClientModifyBooking(bookings[0].date, bookings[0].startTime)) {
        return { ok: false, error: WINDOW_PASSED_ERROR };
    }

    const date = toDateOnly(new Date(dateStr));

    // moveBooking/moveGroupBooking validate the target slot with
    // allowToday: true (admin is allowed to move bookings into today) — the
    // client-facing flow isn't, so that has to be checked here first,
    // against the same public rule getRescheduleSlotsAction already used to
    // offer slots in the first place.
    const { serviceIds, extraMinutes } = serviceContext(bookings);
    const validSlots = await getAvailableSlots(date, serviceIds, extraMinutes);
    if (!validSlots.includes(startTime)) {
        return { ok: false, error: "Zvolený termín už není volný." };
    }

    try {
        if (bookings[0].groupId) {
            const moved = await moveGroupBooking(
                bookings[0].groupId,
                date,
                startTime
            );
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
