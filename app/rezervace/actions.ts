"use server";

import { prisma } from "@/lib/prisma.ts";
import { formatTime } from "@/lib/utils.ts";
import { findOrCreateClient } from "@/lib/find-or-create-client.ts";
import { findClient } from "@/lib/find-client.ts";
import { createBooking } from "@/lib/create-booking.ts";
import { redirect } from "next/navigation";
import { Prisma } from "@/lib/generated/prisma/client";
import { createGroupBooking } from "@/lib/create-group-booking.ts";
import { getAvailableSlots } from "@/lib/get-available-slots.ts";
import { getAvailableDaysInRange } from "@/lib/get-available-days-in-range.ts";
import { sendBookingConfirmationEmail } from "@/lib/send-booking-confirmation-email.ts";
import { after } from "next/server";
import { sendPushNotification } from "@/lib/send-push.ts";

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
            return `/rezervace?${params.toString()}`;
        }
    }

    params.set("error", "slot_taken");
    return `/rezervace?${params.toString()}`;
}

export async function submitBooking(
    context: { date: Date; serviceId: number; startTime: number },
    data: { name: string; phone: string; email: string }
) {
    const name = data.name;
    const phone = data.phone;
    const email = data.email;
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
        });

        const bookingWithRelations = await prisma.booking.findUniqueOrThrow({
            where: { id: booking.id },
            include: { client: true, service: true },
        });
        await sendBookingConfirmationEmail([bookingWithRelations]);
        after(() =>
            sendPushNotification({
                title: "📅 Nová rezervace",
                body: `${bookingWithRelations.client.name} – ${bookingWithRelations.service.name}, ${formatTime(bookingWithRelations.startTime)}`,
                url: "/kalendar",
            })
        );

        redirect(`/rezervace/confirmed?id=${booking.id}`);
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
    data: { names: string[]; phone: string; email: string }
) {
    const phone = data.phone;
    const email = data.email;
    const names = context.serviceIds.map((_, i) => data.names[i]);

    const client = await findOrCreateClient(phone, names[0].trim(), email);

    const people = names.map((name, i) => ({
        clientId: client.id,
        guestName: i === 0 ? undefined : name.trim() || undefined,
        extraTimeMinutes: i === 0 ? client.extraTimeMinutes : 0,
        serviceId: context.serviceIds[i],
    }));

    const extraMinutes = people.reduce((acc, person) => acc + person.extraTimeMinutes, 0);

    const valid = await getAvailableSlots(
        context.date,
        context.serviceIds,
        extraMinutes
    );
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



    try {
        const bookings = await createGroupBooking(
            people,
            context.date,
            context.startTime,
            "ONLINE",
        )

        const bookingsWithRelations = await prisma.booking.findMany({
            where: { groupId: bookings[0].groupId },
            include: { client: true, service: true },
            orderBy: { startTime: "asc" },
        });
        await sendBookingConfirmationEmail(bookingsWithRelations);
        after(() =>
            sendPushNotification({
                title: "👥 Nová skupinová rezervace",
                body: `${bookingsWithRelations[0].client.name} – ${bookingsWithRelations.length} osoby, ${formatTime(bookingsWithRelations[0].startTime)}`,
                url: "/kalendar",
            })
        );

        redirect(`/rezervace/confirmed?groupId=${bookings[0].groupId}`);
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

// Extra time of the (main) contact only — group guests aren't Clients and
// always get 0, same as submitGroupBooking.
export async function getExtraMinutesAction(contact: {
    name: string;
    phone: string;
}): Promise<number> {
    const name = contact.name.trim();
    const phone = contact.phone.trim();
    if (!name && !phone) return 0;

    const client = await findClient(phone || undefined, name);
    return client?.extraTimeMinutes ?? 0;
}

export async function getAvailableSlotsAction(
    date: Date,
    serviceIds: number[],
    extraMinutes: number = 0
): Promise<number[]> {
    return getAvailableSlots(date, serviceIds, extraMinutes);
}
