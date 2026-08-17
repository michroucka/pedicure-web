"use server";

import { findOrCreateClient } from "@/lib/find-or-create-client.ts";
import { createBooking } from "@/lib/create-booking.ts";
import { redirect } from "next/navigation";
import { Prisma } from "@/lib/generated/prisma/client";
import { createGroupBooking } from "@/lib/create-group-booking.ts";
import { getAvailableSlots } from "@/lib/get-available-slots.ts";

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
        const params = new URLSearchParams({
            date: context.date.toISOString().slice(0, 10),
            services: String(context.serviceId),
            error: "slot_taken",
        });
        redirect(`/reservation?${params.toString()}`);
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
            const dateParam = date.toISOString().slice(0, 10);
            const params = new URLSearchParams({
                date: dateParam,
                services: String(serviceId),
                error: "slot_taken",
            });
            redirect(`/reservation?${params.toString()}`);
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
        const params = new URLSearchParams({
            date: context.date.toISOString().slice(0, 10),
            services: context.serviceIds.join(","),
            error: "slot_taken",
        });
        redirect(`/reservation?${params.toString()}`);
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
            const dateParam = context.date.toISOString().slice(0, 10);
            const params = new URLSearchParams({
                date: dateParam,
                services: context.serviceIds.join(","),
                error: "slot_taken",
            });
            redirect(`/reservation?${params.toString()}`);
        } else {
            throw error;
        }
    }
}
