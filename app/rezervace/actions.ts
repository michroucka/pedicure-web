"use server";

import { prisma } from "@/lib/prisma.ts";
import { normalizePhoneForMatch } from "@/lib/utils.ts";
import { findOrCreateClient } from "@/lib/find-or-create-client.ts";
import { createBooking } from "@/lib/create-booking.ts";
import { redirect } from "next/navigation";
import { Prisma } from "@/lib/generated/prisma/client";
import { createGroupBooking } from "@/lib/create-group-booking.ts";
import { getAvailableSlots } from "@/lib/get-available-slots.ts";
import { getAvailableDaysInRange } from "@/lib/get-available-days-in-range.ts";

// Builds the redirect back to the slot picker when a chosen slot can't be
// booked. Distinguishes two causes so the message (and the slot list itself,
// via the carried-forward extraMinutes) reflect what actually happened:
// - the base slot (without extra time) is still free, but this client's
//   extraTimeMinutes push the end time into the next booking
// - the slot itself is genuinely gone (someone else took it)
async function buildSlotConflictRedirect(
    date: Date,
    serviceIds: number[],
    startTime: number,
    extraMinutes: number
): Promise<string> {
    const params = new URLSearchParams({
        date: date.toISOString().slice(0, 10),
        services: serviceIds.join(","),
    });

    if (extraMinutes > 0) {
        const baseValid = await getAvailableSlots(date, serviceIds, 0);
        if (baseValid.includes(startTime)) {
            params.set("error", "extra_time_conflict");
            params.set("extraMinutes", String(extraMinutes));
            return `/reservation?${params.toString()}`;
        }
    }

    params.set("error", "slot_taken");
    return `/reservation?${params.toString()}`;
}

export async function submitBooking(
    context: { date: Date; serviceId: number; startTime: number },
    data: { name: string; phone: string; email: string; reminderRequested: boolean }
) {
    const name = data.name;
    const phone = data.phone;
    const email = data.email;
    const reminderRequested = data.reminderRequested;
    const client = await findOrCreateClient(phone, name, email);

    const valid = await getAvailableSlots(context.date, [context.serviceId], client.extraTimeMinutes);
    if (!valid.includes(context.startTime)) {
        redirect(
            await buildSlotConflictRedirect(
                context.date,
                [context.serviceId],
                context.startTime,
                client.extraTimeMinutes
            )
        );
    }

    const serviceId = context.serviceId;
    const date = context.date;
    const startTime = context.startTime;
    const source = "ONLINE";

    try {
        const booking = await createBooking({
            clientId: client.id,
            serviceId,
            date,
            startTime,
            source,
            extraTimeMinutes: client.extraTimeMinutes,
            reminderRequested,
        });
        redirect(`/reservation/confirmed?id=${booking.id}`);
    } catch (error) {
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
        ) {
            redirect(
                await buildSlotConflictRedirect(
                    date,
                    [serviceId],
                    startTime,
                    client.extraTimeMinutes
                )
            );
        } else {
            throw error;
        }
    }
}

export async function submitGroupBooking(
    context: { date: Date; serviceIds: number[]; startTime: number },
    data: { names: string[]; phone: string; email: string; reminderRequested: boolean }
) {
    const phone = data.phone;
    const email = data.email;
    const reminderRequested = data.reminderRequested;
    const names = context.serviceIds.map((_, i) => data.names[i]);

    const clients = await Promise.all(
        names.map((name) => findOrCreateClient(phone, name, email))
    )

    const extraMinutes = clients.reduce((sum, c) => sum + c.extraTimeMinutes, 0);

    const valid = await getAvailableSlots(context.date, context.serviceIds, extraMinutes);
    if (!valid.includes(context.startTime)) {
        redirect(
            await buildSlotConflictRedirect(
                context.date,
                context.serviceIds,
                context.startTime,
                extraMinutes
            )
        );
    }

    const people = context.serviceIds.map((serviceId, i) => ({
        clientId: clients[i].id,
        extraTimeMinutes: clients[i].extraTimeMinutes,
        serviceId,
    }));

    try {
        const bookings = await createGroupBooking(
            people,
            context.date,
            context.startTime,
            "ONLINE",
            reminderRequested,
        )
        redirect(`/reservation/confirmed?groupId=${bookings[0].groupId}`);
    } catch (error) {
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
        ) {
            redirect(
                await buildSlotConflictRedirect(
                    context.date,
                    context.serviceIds,
                    context.startTime,
                    extraMinutes
                )
            );
        } else {
            throw error;
        }
    }
}

export async function getAvailableDaysAction(
    range: { from: Date; to: Date },
    serviceIds: number[]
): Promise<Date[]> {
    return getAvailableDaysInRange(range, serviceIds);
}

export async function getExtraMinutesAction(
    entries: { name: string; phone: string }[]
): Promise<number> {
    const validEntries = entries
        .map((e) => ({ name: e.name.trim(), phone: e.phone.trim() }))
        .filter((e) => e.name && e.phone);
    if (validEntries.length === 0) return 0;

    const names = [...new Set(validEntries.map((e) => e.name))];
    const candidates = await prisma.client.findMany({
        where: { name: { in: names } },
    });

    return validEntries.reduce((sum, e) => {
        const normalizedPhone = normalizePhoneForMatch(e.phone);
        const match = candidates.find(
            (c) =>
                c.name === e.name &&
                normalizePhoneForMatch(c.phone) === normalizedPhone
        );
        return sum + (match?.extraTimeMinutes ?? 0);
    }, 0);
}

export async function getAvailableSlotsAction(
    date: Date,
    serviceIds: number[],
    extraMinutes: number = 0
): Promise<number[]> {
    return getAvailableSlots(date, serviceIds, extraMinutes);
}
