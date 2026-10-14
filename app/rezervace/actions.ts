"use server";

import { prisma } from "@/lib/prisma.ts";
import { formatTime } from "@/lib/utils.ts";
import { findOrCreateClient } from "@/lib/find-or-create-client.ts";
import { findClient } from "@/lib/find-client.ts";
import { normalizeExtraMinutes } from "@/lib/extra-time.ts";
import { createBooking } from "@/lib/create-booking.ts";
import { redirect } from "next/navigation";
import { Prisma } from "@/lib/generated/prisma/client";
import { createGroupBooking } from "@/lib/create-group-booking.ts";
import { getAvailableSlots } from "@/lib/get-available-slots.ts";
import { getAvailableDaysInRange } from "@/lib/get-available-days-in-range.ts";
import { sendBookingConfirmationEmail } from "@/lib/send-booking-confirmation-email.ts";
import { after } from "next/server";
import { sendPushNotification } from "@/lib/send-push.ts";
import { z } from "zod";
import {
    contactLookupSchema,
    dateRangeSchema,
    groupContextSchema,
    groupDataSchema,
    soloContextSchema,
    soloDataSchema,
} from "@/app/rezervace/schema.ts";
import { serviceIdsSchema } from "@/lib/validation.ts";

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
    const parsedContext = soloContextSchema.safeParse(context);
    const parsedData = soloDataSchema.safeParse(data);
    if (!parsedContext.success || !parsedData.success) {
        redirect("/rezervace");
    }
    const name = parsedData.data.name;
    const phone = parsedData.data.phone;
    const email = parsedData.data.email;
    const serviceId = parsedContext.data.serviceId;
    const date = parsedContext.data.date;
    const startTime = parsedContext.data.startTime;

    const service = await prisma.service.findUnique({
        where: { id: serviceId, active: true },
    });
    if (!service) {
        redirect("/rezervace");
    }

    const client = await findOrCreateClient(phone, name, email);

    const extraTimeMinutes = client.extraTimeMinutes;
    const source = "ONLINE";

    const valid = await getAvailableSlots(date, [serviceId], extraTimeMinutes);
    if (!valid.includes(startTime)) {
        redirect(
            await buildSlotConflictRedirect(
                date,
                [serviceId],
                startTime,
                extraTimeMinutes
            )
        );
    }

    try {
        const booking = await createBooking({
            clientId: client.id,
            serviceId,
            date,
            startTime,
            source,
            extraTimeMinutes,
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
                    extraTimeMinutes
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
    const parsedContext = groupContextSchema.safeParse(context);
    const parsedData = groupDataSchema.safeParse(data);
    if (!parsedContext.success || !parsedData.success) {
        redirect("/rezervace");
    }

    const phone = parsedData.data.phone;
    const email = parsedData.data.email;
    const names = parsedData.data.names;
    const serviceIds = parsedContext.data.serviceIds;
    const date = parsedContext.data.date;
    const startTime = parsedContext.data.startTime;

    if (names.length !== serviceIds.length) {
        redirect("/rezervace");
    }

    const services = await prisma.service.findMany({
        where: { id: { in: serviceIds }, active: true },
    });

    if (services.length !== new Set(serviceIds).size) {
        redirect("/rezervace");
    }

    const client = await findOrCreateClient(phone, names[0], email);

    const people = names.map((name, i) => ({
        clientId: client.id,
        guestName: i === 0 ? undefined : name,
        extraTimeMinutes: i === 0 ? client.extraTimeMinutes : 0,
        serviceId: serviceIds[i],
    }));

    const extraMinutes = people.reduce((acc, person) => acc + person.extraTimeMinutes, 0);

    const valid = await getAvailableSlots(
        date,
        serviceIds,
        extraMinutes
    );
    if (!valid.includes(startTime)) {
        redirect(
            await buildSlotConflictRedirect(
                date,
                serviceIds,
                startTime,
                extraMinutes
            )
        );
    }



    try {
        const bookings = await createGroupBooking(
            people,
            date,
            startTime,
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
                    date,
                    serviceIds,
                    startTime,
                    extraMinutes
                )
            );
        } else {
            throw error;
        }
    }
}

// extraMinutes comes from the URL after an extra_time_conflict redirect
// (see buildSlotConflictRedirect) — the day picker has to use it too, not
// just the slot list, or it offers days where this client fits nowhere.
export async function getAvailableDaysAction(
    range: { from: Date; to: Date },
    serviceIds: number[],
    extraMinutes: number = 0
): Promise<Date[]> {
    const parsedRange = dateRangeSchema.safeParse(range);
    const parsedServiceIds = serviceIdsSchema.safeParse(serviceIds);
    if (!parsedRange.success || !parsedServiceIds.success) return [];

    return getAvailableDaysInRange(
        parsedRange.data,
        parsedServiceIds.data,
        normalizeExtraMinutes(extraMinutes)
    );
}

// Extra time of the (main) contact only — group guests aren't Clients and
// always get 0, same as submitGroupBooking.
export async function getExtraMinutesAction(contact: {
    name: string;
    phone: string;
}): Promise<number> {
    const parsed = contactLookupSchema.safeParse(contact);
    if (!parsed.success) return 0;

    const { name, phone } = parsed.data;
    if (!name && !phone) return 0;

    const client = await findClient(phone || undefined, name);
    return client?.extraTimeMinutes ?? 0;
}

export async function getAvailableSlotsAction(
    date: Date,
    serviceIds: number[],
    extraMinutes: number = 0
): Promise<number[]> {
    // Called in the background by the slot picker — invalid input just
    // means "no slots", not a redirect.
    const parsedDate = z.date().safeParse(date);
    const parsedServiceIds = serviceIdsSchema.safeParse(serviceIds);
    if (!parsedDate.success || !parsedServiceIds.success) return [];

    return getAvailableSlots(
        parsedDate.data,
        parsedServiceIds.data,
        normalizeExtraMinutes(extraMinutes)
    );
}
