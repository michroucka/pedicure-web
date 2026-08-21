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
    dateStr: string
): Promise<number[]> {
    const date = toDateOnly(new Date(dateStr));

    if (groupId) {
        const bookings = await prisma.booking.findMany({
            where: { groupId, status: "CONFIRMED" },
            include: { client: true },
        });
        const serviceIds = bookings.map((b) => b.serviceId);
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
        [booking.serviceId],
        booking.client.extraTimeMinutes,
        { allowToday: true }
    );
}

export async function cancelBookingAction(id: string) {
    await cancelBooking(id);
    revalidatePath("/admin");
}

export async function moveBookingAction(
    id: string,
    groupId: string | null,
    dateStr: string,
    startTime: number
): Promise<{ ok: true } | { ok: false; error: string }> {
    const date = toDateOnly(new Date(dateStr));

    try {
        if (groupId) {
            await moveGroupBooking(groupId, date, startTime);
        } else {
            await moveBooking(id, date, startTime);
        }
    } catch (error) {
        if (error instanceof SlotUnavailableError) {
            return { ok: false, error: error.message };
        }
        throw error;
    }

    revalidatePath("/admin");
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
    phone: string;
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

    const clients = await Promise.all(
        input.people.map((p) => findOrCreateClient(input.phone, p.name))
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
                input.source,
                false
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

    revalidatePath("/admin");
    return { ok: true };
}
