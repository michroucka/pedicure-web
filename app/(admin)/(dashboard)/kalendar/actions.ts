"use server";

import { revalidatePath } from "next/cache";
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

export async function getMoveSlotsAction(
    id: string,
    groupId: string | null,
    dateStr: string,
    // Lets the edit dialog preview slots for services the person hasn't
    // saved yet — same order as bookings sorted by startTime.
    overrideServiceIds?: number[]
): Promise<number[]> {
    const date = toDateOnly(new Date(dateStr));

    if (groupId) {
        const bookings = await prisma.booking.findMany({
            where: { groupId, status: "CONFIRMED" },
            include: { client: true },
            orderBy: { startTime: "asc" },
        });
        const serviceIds =
            overrideServiceIds ?? bookings.map((b) => b.serviceId);
        const extraMinutes = bookings.reduce(
            (sum, b) => sum + b.client.extraTimeMinutes,
            0
        );
        return getAvailableSlots(date, serviceIds, extraMinutes, {
            allowToday: true,
        });
    }

    const booking = await prisma.booking.findUniqueOrThrow({
        where: { id },
        include: { client: true },
    });
    return getAvailableSlots(
        date,
        [overrideServiceIds?.[0] ?? booking.serviceId],
        booking.client.extraTimeMinutes,
        { allowToday: true }
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
    people: { bookingId: string; name: string; serviceId: number }[];
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
        include: { client: true },
        orderBy: { startTime: "asc" },
    });

    if (existing.length !== input.people.length) {
        return { ok: false, error: "Rezervace nenalezena." };
    }

    // Name/phone/note are plain Client updates regardless of whether the
    // slot itself changes — a typo fix shouldn't touch the Booking at all
    // (and so shouldn't invalidate its cancelToken). Phone is shared across
    // the whole group (see findOrCreateClient), so it's written to every
    // member's Client; note is collected only for the main contact.
    const trimmedPhone = input.phone.trim() || null;
    const trimmedNote = input.note.trim() || null;
    await Promise.all(
        existing.map((b, i) =>
            prisma.client.update({
                where: { id: b.clientId },
                data: {
                    name: input.people[i].name,
                    phone: trimmedPhone,
                    ...(i === 0 ? { note: trimmedNote } : {}),
                },
            })
        )
    );

    const scheduleChanged =
        existing[0].date.getTime() !== date.getTime() ||
        existing[0].startTime !== input.startTime ||
        existing.some((b, i) => b.serviceId !== input.people[i].serviceId);

    if (!scheduleChanged) {
        revalidatePath("/kalendar");
        return { ok: true };
    }

    try {
        if (input.groupId) {
            await moveGroupBooking(input.groupId, date, input.startTime, {
                outsideHours: input.outsideHours,
                serviceOverrides: Object.fromEntries(
                    existing.map((b, i) => [b.id, input.people[i].serviceId])
                ),
            });
        } else {
            await moveBooking(input.people[0].bookingId, date, input.startTime, {
                outsideHours: input.outsideHours,
                serviceId: input.people[0].serviceId,
            });
        }
    } catch (error) {
        if (error instanceof SlotUnavailableError) {
            return { ok: false, error: error.message };
        }
        throw error;
    }

    revalidatePath("/kalendar");
    return { ok: true };
}

export async function getManualBookingSlotsAction(
    serviceIds: number[],
    dateStr: string
): Promise<number[]> {
    const date = toDateOnly(new Date(dateStr));
    return getAvailableSlots(date, serviceIds, 0, { allowToday: true });
}

export async function createManualBookingAction(input: {
    phone?: string;
    note?: string;
    people: { name: string; serviceId: number }[];
    dateStr: string;
    startTime: number;
    source: "PHONE" | "IN_PERSON";
    outsideHours?: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> {
    const date = toDateOnly(new Date(input.dateStr));

    if (date.getTime() < getCzechToday().getTime()) {
        return { ok: false, error: "Nelze vytvořit rezervaci v minulosti." };
    }

    // Note is only ever collected for the main contact, same as phone —
    // the rest of the group shares their contact but gets its own name.
    const clients = await Promise.all(
        input.people.map((p, i) =>
            findOrCreateClient(
                input.phone,
                p.name,
                undefined,
                i === 0 ? input.note : undefined
            )
        )
    );

    const serviceIds = input.people.map((p) => p.serviceId);
    const extraMinutes = clients.reduce(
        (sum, c) => sum + c.extraTimeMinutes,
        0
    );

    if (input.outsideHours) {
        // Custom time entered by hand — skips the availability-window
        // check entirely, so overlap with existing bookings needs its
        // own explicit check here.
        const services = await prisma.service.findMany({
            where: { id: { in: serviceIds } },
        });
        const totalDuration =
            services.reduce((sum, s) => sum + s.durationMinutes, 0) +
            extraMinutes;

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
            { allowToday: true }
        );
        if (!validSlots.includes(input.startTime)) {
            return { ok: false, error: "Zvolený termín už není volný." };
        }
    }

    try {
        if (input.people.length === 1) {
            await createBooking({
                clientId: clients[0].id,
                serviceId: input.people[0].serviceId,
                date,
                startTime: input.startTime,
                source: input.source,
                extraTimeMinutes: clients[0].extraTimeMinutes,
            });
        } else {
            await createGroupBooking(
                input.people.map((p, i) => ({
                    clientId: clients[i].id,
                    extraTimeMinutes: clients[i].extraTimeMinutes,
                    serviceId: p.serviceId,
                })),
                date,
                input.startTime,
                input.source
            );
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

    revalidatePath("/kalendar");
    return { ok: true };
}
