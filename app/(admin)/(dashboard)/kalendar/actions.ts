"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { prisma } from "@/lib/prisma.ts";
import { Prisma } from "@/lib/generated/prisma/client.ts";
import { cancelBooking } from "@/lib/cancel-booking.ts";
import {
    moveBooking,
    moveGroupBooking,
    SlotUnavailableError,
} from "@/lib/move-booking.ts";
import { getAvailableSlots } from "@/lib/get-available-slots.ts";
import { hasOverlappingBooking } from "@/lib/check-booking-overlap.ts";
import { findOrCreateClient } from "@/lib/find-or-create-client.ts";
import { createBooking } from "@/lib/create-booking.ts";
import { createGroupBooking } from "@/lib/create-group-booking.ts";
import { toDateOnly, getCzechToday } from "@/lib/utils.ts";
import { normalizeExtraMinutes } from "@/lib/extra-time.ts";
import { sendBookingMovedEmail } from "@/lib/send-booking-confirmation-email.ts";

export async function getMoveSlotsAction(
    id: string,
    groupId: string | null,
    dateStr: string,
    // Lets the edit dialog preview slots for services / extra time the
    // person hasn't saved yet — same order as bookings sorted by startTime.
    overrideServiceIds?: number[],
    overrideExtraMinutes?: number[]
): Promise<number[]> {
    const date = toDateOnly(new Date(dateStr));

    if (groupId) {
        const bookings = await prisma.booking.findMany({
            where: { groupId, status: "CONFIRMED" },
            orderBy: { startTime: "asc" },
        });
        const serviceIds =
            overrideServiceIds ?? bookings.map((b) => b.serviceId);
        const extraMinutes = (
            overrideExtraMinutes?.map(normalizeExtraMinutes) ??
            bookings.map((b) => b.extraTimeMinutes)
        ).reduce((sum, m) => sum + m, 0);
        return getAvailableSlots(date, serviceIds, extraMinutes, {
            allowToday: true,
            excludeBookingIds: bookings.map((b) => b.id),
            allowUnfillableGaps: true,
        });
    }

    const booking = await prisma.booking.findUniqueOrThrow({
        where: { id },
    });
    return getAvailableSlots(
        date,
        [overrideServiceIds?.[0] ?? booking.serviceId],
        overrideExtraMinutes
            ? normalizeExtraMinutes(overrideExtraMinutes[0])
            : booking.extraTimeMinutes,
        {
            allowToday: true,
            excludeBookingIds: [booking.id],
            allowUnfillableGaps: true,
        }
    );
}

export async function cancelBookingAction(id: string) {
    await cancelBooking(id);
    revalidatePath("/kalendar");
}

export async function updateBookingAction(input: {
    groupId: string | null;
    // In the same order as bookings sorted by startTime — matches how
    // BookingDetailDialog builds groupBookings.
    people: {
        bookingId: string;
        name: string;
        serviceId: number;
        extraTimeMinutes: number;
    }[];
    phone: string;
    note: string;
    dateStr: string;
    startTime: number;
    outsideHours?: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> {
    const date = toDateOnly(new Date(input.dateStr));

    if (date.getTime() < getCzechToday().getTime()) {
        return { ok: false, error: "Nelze přesunout rezervaci do minulosti." };
    }

    const existing = await prisma.booking.findMany({
        where: input.groupId
            ? { groupId: input.groupId, status: "CONFIRMED" }
            : { id: input.people[0].bookingId },
        orderBy: { startTime: "asc" },
    });

    if (existing.length !== input.people.length) {
        return { ok: false, error: "Rezervace nenalezena." };
    }

    const extraTimes = input.people.map((p) =>
        normalizeExtraMinutes(p.extraTimeMinutes)
    );

    // Name/phone/note fixes are written in place regardless of whether the
    // slot itself changes — a typo fix shouldn't move the Booking (and so
    // shouldn't invalidate its cancelToken). Only the main contact is a
    // Client of this group; everyone else's name lives on their own
    // booking as guestName — writing it to b.clientId would rename the main
    // contact once per member. Must run before the move below, which copies
    // guestName over to the new bookings.
    const trimmedPhone = input.phone.trim() || null;
    const trimmedNote = input.note.trim() || null;
    await prisma.$transaction(
        existing.map((b, i) =>
            i === 0
                ? prisma.client.update({
                      where: { id: b.clientId },
                      data: {
                          name: input.people[0].name.trim(),
                          phone: trimmedPhone,
                          note: trimmedNote,
                      },
                  })
                : prisma.booking.update({
                      where: { id: b.id },
                      data: { guestName: input.people[i].name.trim() || null },
                  })
        )
    );

    const scheduleChanged =
        existing[0].date.getTime() !== date.getTime() ||
        existing[0].startTime !== input.startTime ||
        existing.some(
            (b, i) =>
                b.serviceId !== input.people[i].serviceId ||
                b.extraTimeMinutes !== extraTimes[i]
        );

    if (!scheduleChanged) {
        revalidatePath("/kalendar");
        return { ok: true };
    }

    let movedIds: string[];
    try {
        if (input.groupId) {
            const moved = await moveGroupBooking(input.groupId, date, input.startTime, {
                outsideHours: input.outsideHours,
                serviceOverrides: Object.fromEntries(
                    existing.map((b, i) => [b.id, input.people[i].serviceId])
                ),
                extraTimeOverrides: Object.fromEntries(
                    existing.map((b, i) => [b.id, extraTimes[i]])
                ),
                allowUnfillableGaps: true,
            });
            movedIds = moved.map((b) => b.id);
        } else {
            const moved = await moveBooking(input.people[0].bookingId, date, input.startTime, {
                outsideHours: input.outsideHours,
                serviceId: input.people[0].serviceId,
                extraTimeMinutes: extraTimes[0],
                allowUnfillableGaps: true,
            });
            movedIds = [moved.id];
        }
    } catch (error) {
        if (error instanceof SlotUnavailableError) {
            return { ok: false, error: error.message };
        }
        throw error;
    }

    // A move cancels + recreates, so the client's magic link from the
    // confirmation email stops working — online bookings (the only ones
    // with that email and link) get a new one. Phone/in-person bookings
    // were arranged directly and never got a link.
    if (existing[0].source === "ONLINE") {
        after(() => sendBookingMovedEmail(movedIds));
    }

    revalidatePath("/kalendar");
    return { ok: true };
}

export async function getManualBookingSlotsAction(
    serviceIds: number[],
    dateStr: string,
    // Sum over the whole group — must match what createManualBookingAction
    // will validate with, or the dialog offers slots that then get rejected.
    extraMinutes: number = 0
): Promise<number[]> {
    const date = toDateOnly(new Date(dateStr));
    return getAvailableSlots(date, serviceIds, normalizeExtraMinutes(extraMinutes), {
        allowToday: true,
        allowUnfillableGaps: true,
    });
}

export async function createManualBookingAction(input: {
    phone?: string;
    email?: string;
    note?: string;
    people: { name: string; serviceId: number; extraTimeMinutes: number }[];
    dateStr: string;
    startTime: number;
    source: "PHONE" | "IN_PERSON";
    outsideHours?: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> {
    const date = toDateOnly(new Date(input.dateStr));

    if (date.getTime() < getCzechToday().getTime()) {
        return { ok: false, error: "Nelze vytvořit rezervaci v minulosti." };
    }

    // Only the main contact is a Client — the rest of the group shares
    // their contact and is stored as guestName on its own booking, same as
    // the online group booking. Email and note belong to the main contact
    // too; email isn't a form field here, it's only ever carried through
    // silently when the admin picked an existing client from the name
    // autocomplete.
    const client = await findOrCreateClient(
        input.phone,
        input.people[0].name.trim(),
        input.email,
        input.note
    );

    // Extra time comes from the form per person (prefilled from the main
    // contact's Client), not from Clients — guests don't have one.
    const people = input.people.map((p, i) => ({
        clientId: client.id,
        guestName: i === 0 ? null : p.name.trim() || null,
        extraTimeMinutes: normalizeExtraMinutes(p.extraTimeMinutes),
        serviceId: p.serviceId,
    }));
    const serviceIds = people.map((p) => p.serviceId);
    const extraMinutes = people.reduce((sum, p) => sum + p.extraTimeMinutes, 0);

    if (input.outsideHours) {
        // Custom time entered by hand — skips the availability-window
        // check entirely, so overlap with existing bookings needs its
        // own explicit check here.
        const services = await prisma.service.findMany({
            where: { id: { in: serviceIds } },
        });
        // Summed per person, not per fetched service — `in` returns each
        // service once, so two people with the same service would
        // otherwise only count it once.
        const totalDuration =
            serviceIds.reduce(
                (sum, id) =>
                    sum +
                    (services.find((s) => s.id === id)?.durationMinutes ?? 0),
                0
            ) + extraMinutes;

        const overlaps = await hasOverlappingBooking(
            date,
            input.startTime,
            input.startTime + totalDuration
        );
        if (overlaps) {
            return { ok: false, error: "Zvolený čas koliduje s jinou rezervací." };
        }
    } else {
        const validSlots = await getAvailableSlots(
            date,
            serviceIds,
            extraMinutes,
            { allowToday: true, allowUnfillableGaps: true }
        );
        if (!validSlots.includes(input.startTime)) {
            return { ok: false, error: "Zvolený termín už není volný." };
        }
    }

    try {
        if (people.length === 1) {
            await createBooking({
                ...people[0],
                date,
                startTime: input.startTime,
                source: input.source,
            });
        } else {
            await createGroupBooking(people, date, input.startTime, input.source);
        }
    } catch (error) {
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
        ) {
            return { ok: false, error: "Zvolený termín už není volný." };
        }
        throw error;
    }

    // The main contact's extra time field doubles as their Client setting,
    // so it doesn't have to be set separately on the Klienti page. Only
    // after the booking succeeded — a rejected slot changes nothing.
    if (client.extraTimeMinutes !== people[0].extraTimeMinutes) {
        await prisma.client.update({
            where: { id: client.id },
            data: { extraTimeMinutes: people[0].extraTimeMinutes },
        });
    }

    revalidatePath("/kalendar");
    return { ok: true };
}
