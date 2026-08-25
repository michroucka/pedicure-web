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
import { toDateOnly } from "@/lib/utils.ts";
import { revalidatePath } from "next/cache";
import type { BookingWithRelations } from "@/lib/get-booking-group-by-token.ts";

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
            revalidatePath(`/rezervace/sprava/${token}`);
            return { ok: true, newToken: moved[0].cancelToken };
        }

        const moved = await moveBooking(bookings[0].id, date, startTime);
        revalidatePath(`/rezervace/sprava/${token}`);
        return { ok: true, newToken: moved.cancelToken };
    } catch (error) {
        if (error instanceof SlotUnavailableError) {
            return { ok: false, error: error.message };
        }
        throw error;
    }
}
