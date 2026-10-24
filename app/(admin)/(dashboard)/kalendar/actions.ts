"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { prisma } from "@/lib/prisma.ts";
import { requireAdmin } from "@/lib/require-admin.ts";
import { isBookingSlotConflict } from "@/lib/booking-conflict-error.ts";
import {
    moveBooking,
    moveGroupBooking,
    PAST_MIDNIGHT_ERROR,
    SlotUnavailableError,
} from "@/lib/move-booking.ts";
import { getAvailableSlots } from "@/lib/get-available-slots.ts";
import { hasOverlappingBooking } from "@/lib/check-booking-overlap.ts";
import { findOrCreateClient } from "@/lib/find-or-create-client.ts";
import { createBooking } from "@/lib/create-booking.ts";
import { createGroupBooking } from "@/lib/create-group-booking.ts";
import { endsAfterMidnight, toDateOnly, getCzechToday } from "@/lib/utils.ts";
import { normalizeExtraMinutes } from "@/lib/extra-time.ts";
import { sendBookingMovedEmail } from "@/lib/send-booking-confirmation-email.ts";
import { idSchema } from "@/lib/validation.ts";
import { sumServiceDurations } from "@/lib/service-duration.ts";
import {
    createManualBookingInputSchema,
    manualBookingSlotsInputSchema,
    moveSlotsInputSchema,
    updateBookingInputSchema,
} from "./schema.ts";

// The admin forms validate the same things first, so this only shows up
// for tampered input or a phone that couldn't be normalized.
function invalidInput(error: { issues: { message: string }[] }) {
    return {
        ok: false as const,
        error: error.issues[0]?.message ?? "Neplatné údaje.",
    };
}

// Ids of services that don't exist (or, with activeOnly, are no longer
// offered). Counted against the unique ids – `in` returns each service
// once even when two people picked the same one.
async function hasUnknownService(serviceIds: number[], activeOnly: boolean) {
    const uniqueIds = [...new Set(serviceIds)];
    const found = await prisma.service.count({
        where: { id: { in: uniqueIds }, ...(activeOnly && { active: true }) },
    });
    return found !== uniqueIds.length;
}

export async function getMoveSlotsAction(
    id: string,
    groupId: string | null,
    dateStr: string,
    // Lets the edit dialog preview slots for services / extra time the
    // person hasn't saved yet – same order as bookings sorted by startTime.
    overrideServiceIds?: number[],
    overrideExtraMinutes?: number[]
): Promise<number[]> {
    await requireAdmin();
    const parsed = moveSlotsInputSchema.safeParse({
        id,
        groupId,
        dateStr,
        overrideServiceIds,
        overrideExtraMinutes,
    });
    if (!parsed.success) return [];
    ({ id, groupId, dateStr, overrideServiceIds, overrideExtraMinutes } =
        parsed.data);

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

    const booking = await prisma.booking.findUnique({
        where: { id },
    });
    if (!booking) return [];
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
    await requireAdmin();
    if (!idSchema.safeParse(id).success) return;
    // updateMany: a booking cancelled or deleted meanwhile (another device,
    // retention cron) is a no-op, not a thrown P2025.
    await prisma.booking.updateMany({
        where: { id, status: "CONFIRMED" },
        data: { status: "CANCELLED" },
    });
    revalidatePath("/kalendar");
}

export async function updateBookingAction(input: {
    groupId: string | null;
    // Matched to the group's bookings by bookingId, in any order.
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
    await requireAdmin();
    const parsed = updateBookingInputSchema.safeParse(input);
    if (!parsed.success) return invalidInput(parsed.error);
    input = parsed.data;

    const date = toDateOnly(new Date(input.dateStr));

    if (date.getTime() < getCzechToday().getTime()) {
        return { ok: false, error: "Nelze přesunout rezervaci do minulosti." };
    }

    // Existing bookings may keep a service that's no longer offered – only
    // check that it exists, not that it's active.
    if (
        await hasUnknownService(
            input.people.map((p) => p.serviceId),
            false
        )
    ) {
        return { ok: false, error: "Služba nenalezena." };
    }

    const existing = await prisma.booking.findMany({
        where: input.groupId
            ? { groupId: input.groupId, status: "CONFIRMED" }
            : { id: input.people[0].bookingId, status: "CONFIRMED" },
        orderBy: { startTime: "asc" },
    });

    if (existing.length === 0) {
        return { ok: false, error: "Rezervace nenalezena." };
    }

    // Each person from the dialog is matched to their booking by id, never
    // by position: the group's order changes when someone is cancelled
    // (admin cancels per person), and a dialog opened before that would
    // otherwise write names/services onto the wrong person.
    const formByBookingId = new Map(input.people.map((p) => [p.bookingId, p]));
    if (
        existing.length !== input.people.length ||
        existing.some((b) => !formByBookingId.has(b.id))
    ) {
        return {
            ok: false,
            error: "Rezervace se mezitím změnila. Zavřete ji a otevřete znovu.",
        };
    }
    const people = existing.map((booking) => {
        const form = formByBookingId.get(booking.id)!;
        return {
            booking,
            name: form.name,
            serviceId: form.serviceId,
            extraTimeMinutes: normalizeExtraMinutes(form.extraTimeMinutes),
        };
    });

    // Name/phone/note fixes are written in place regardless of whether the
    // slot itself changes – a typo fix shouldn't move the Booking (and so
    // shouldn't invalidate its cancelToken). Must run before the move
    // below, which copies guestName over to the new bookings.
    //
    // Where a person's name belongs is decided per booking, never by its
    // position in the group (the main contact's own booking may be
    // cancelled, so "first booking = main contact" would rename the client
    // after a guest):
    // - guestName set: a guest, the name lives on their booking
    // - guestName empty and the first booking of its client in this group:
    //   the name is that client's (the main contact, or a pre-2026-10 guest
    //   who got an own Client)
    // - guestName empty but the client already came up earlier: a
    //   pre-2026-10 guest that was matched onto the main contact's Client
    //   by the shared phone - the name goes to guestName, which also
    //   repairs such a group on its first save
    // Phone and note are the group's contact details and always go to the
    // main contact's client, even when their own booking is cancelled.
    const contactDetails = {
        phone: input.phone || null,
        note: input.note || null,
    };
    const contactClientId = (
        existing.find((b) => b.guestName === null) ?? existing[0]
    ).clientId;
    const namedClientIds = new Set<string>();
    const nameWrites = people.map(({ booking, name }) => {
        const ownsClientName =
            booking.guestName === null && !namedClientIds.has(booking.clientId);
        if (!ownsClientName) {
            return prisma.booking.update({
                where: { id: booking.id },
                data: { guestName: name },
            });
        }
        namedClientIds.add(booking.clientId);
        return prisma.client.update({
            where: { id: booking.clientId },
            data: {
                name,
                ...(booking.clientId === contactClientId && contactDetails),
            },
        });
    });
    await prisma.$transaction([
        ...nameWrites,
        // Only guests left (the main contact's booking cancelled): the
        // contact details still need to reach the client.
        ...(namedClientIds.has(contactClientId)
            ? []
            : [
                  prisma.client.update({
                      where: { id: contactClientId },
                      data: contactDetails,
                  }),
              ]),
    ]);

    const scheduleChanged =
        existing[0].date.getTime() !== date.getTime() ||
        existing[0].startTime !== input.startTime ||
        people.some(
            (person) =>
                person.booking.serviceId !== person.serviceId ||
                person.booking.extraTimeMinutes !== person.extraTimeMinutes
        );

    if (!scheduleChanged) {
        revalidatePath("/kalendar");
        return { ok: true };
    }

    let movedIds: string[];
    try {
        if (input.groupId) {
            const moved = await moveGroupBooking(
                input.groupId,
                date,
                input.startTime,
                {
                    outsideHours: input.outsideHours,
                    serviceOverrides: Object.fromEntries(
                        people.map((p) => [p.booking.id, p.serviceId])
                    ),
                    extraTimeOverrides: Object.fromEntries(
                        people.map((p) => [p.booking.id, p.extraTimeMinutes])
                    ),
                    allowUnfillableGaps: true,
                }
            );
            movedIds = moved.map((b) => b.id);
        } else {
            const moved = await moveBooking(
                people[0].booking.id,
                date,
                input.startTime,
                {
                    outsideHours: input.outsideHours,
                    serviceId: people[0].serviceId,
                    extraTimeMinutes: people[0].extraTimeMinutes,
                    allowUnfillableGaps: true,
                }
            );
            movedIds = [moved.id];
        }
    } catch (error) {
        if (error instanceof SlotUnavailableError) {
            return { ok: false, error: error.message };
        }
        throw error;
    }

    // A move cancels + recreates, so the client's magic link from the
    // confirmation email stops working – online bookings (the only ones
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
    // Sum over the whole group – must match what createManualBookingAction
    // will validate with, or the dialog offers slots that then get rejected.
    extraMinutes: number = 0
): Promise<number[]> {
    await requireAdmin();
    const parsed = manualBookingSlotsInputSchema.safeParse({
        serviceIds,
        dateStr,
        extraMinutes,
    });
    if (!parsed.success) return [];
    ({ serviceIds, dateStr, extraMinutes } = parsed.data);

    const date = toDateOnly(new Date(dateStr));
    return getAvailableSlots(
        date,
        serviceIds,
        normalizeExtraMinutes(extraMinutes),
        {
            allowToday: true,
            allowUnfillableGaps: true,
        }
    );
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
    await requireAdmin();
    const parsed = createManualBookingInputSchema.safeParse(input);
    if (!parsed.success) return invalidInput(parsed.error);
    input = parsed.data;

    const date = toDateOnly(new Date(input.dateStr));

    if (date.getTime() < getCzechToday().getTime()) {
        return { ok: false, error: "Nelze vytvořit rezervaci v minulosti." };
    }

    // Every check below runs before findOrCreateClient – a rejected booking
    // must not create or update a client. None of them need the client:
    // extra time comes from the form, not from the Client.
    if (
        await hasUnknownService(
            input.people.map((p) => p.serviceId),
            true
        )
    ) {
        return { ok: false, error: "Služba už není v nabídce." };
    }

    // Extra time comes from the form per person (prefilled from the main
    // contact's Client), not from Clients – guests don't have one.
    const people = input.people.map((p, i) => ({
        guestName: i === 0 ? null : p.name,
        extraTimeMinutes: normalizeExtraMinutes(p.extraTimeMinutes),
        serviceId: p.serviceId,
    }));
    const serviceIds = people.map((p) => p.serviceId);
    const extraMinutes = people.reduce((sum, p) => sum + p.extraTimeMinutes, 0);

    if (input.outsideHours) {
        // Custom time entered by hand – skips the availability-window
        // check entirely, so overlap with existing bookings needs its
        // own explicit check here.
        const services = await prisma.service.findMany({
            where: { id: { in: serviceIds } },
        });
        const totalDuration =
            sumServiceDurations(serviceIds, services) + extraMinutes;

        // A custom time skips the availability windows, which are what
        // normally keeps a booking inside the day.
        if (endsAfterMidnight(input.startTime, totalDuration)) {
            return { ok: false, error: PAST_MIDNIGHT_ERROR };
        }

        const overlaps = await hasOverlappingBooking(
            date,
            input.startTime,
            input.startTime + totalDuration
        );
        if (overlaps) {
            return {
                ok: false,
                error: "Zvolený čas koliduje s jinou rezervací.",
            };
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

    // Only the main contact is a Client – the rest of the group shares
    // their contact and is stored as guestName on its own booking, same as
    // the online group booking. Email and note belong to the main contact
    // too; email isn't a form field here, it's only ever carried through
    // silently when the admin picked an existing client from the name
    // autocomplete.
    const client = await findOrCreateClient(
        input.phone || undefined,
        input.people[0].name,
        input.email || undefined,
        input.note || undefined
    );
    const bookingPeople = people.map((p) => ({ ...p, clientId: client.id }));

    try {
        if (bookingPeople.length === 1) {
            await createBooking({
                ...bookingPeople[0],
                date,
                startTime: input.startTime,
                source: input.source,
            });
        } else {
            await createGroupBooking(
                bookingPeople,
                date,
                input.startTime,
                input.source
            );
        }
    } catch (error) {
        if (isBookingSlotConflict(error)) {
            return { ok: false, error: "Zvolený termín už není volný." };
        }
        throw error;
    }

    // The main contact's extra time field doubles as their Client setting,
    // so it doesn't have to be set separately on the Klienti page. Only
    // after the booking succeeded – a rejected slot changes nothing.
    if (client.extraTimeMinutes !== people[0].extraTimeMinutes) {
        await prisma.client.update({
            where: { id: client.id },
            data: { extraTimeMinutes: people[0].extraTimeMinutes },
        });
    }

    revalidatePath("/kalendar");
    return { ok: true };
}
