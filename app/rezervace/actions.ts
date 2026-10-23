"use server";

import { prisma } from "@/lib/prisma.ts";
import { formatTime } from "@/lib/utils.ts";
import { findOrCreateClient } from "@/lib/find-or-create-client.ts";
import { findClient } from "@/lib/find-client.ts";
import { normalizeExtraMinutes } from "@/lib/extra-time.ts";
import { createBooking } from "@/lib/create-booking.ts";
import { redirect } from "next/navigation";
import { isBookingSlotConflict } from "@/lib/booking-conflict-error.ts";
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

// Everything sent after an online booking, run via after() so the client's
// redirect doesn't wait for Resend/Web Push.
async function notifyNewOnlineBooking(where: { id: string } | { groupId: string }) {
    const bookings = await prisma.booking.findMany({
        where,
        include: { client: true, service: true },
        orderBy: { startTime: "asc" },
    });
    if (bookings.length === 0) return;

    await sendBookingConfirmationEmail(bookings);
    await sendPushNotification(
        bookings.length > 1
            ? {
                  title: "👥 Nová skupinová rezervace",
                  body: `${bookings[0].client.name} – ${bookings.length} osoby, ${formatTime(bookings[0].startTime)}`,
                  url: "/kalendar",
              }
            : {
                  title: "📅 Nová rezervace",
                  body: `${bookings[0].client.name} – ${bookings[0].service.name}, ${formatTime(bookings[0].startTime)}`,
                  url: "/kalendar",
              }
    );
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
    const { name, phone, email } = parsedData.data;
    const { serviceId, date, startTime } = parsedContext.data;


    const service = await prisma.service.findUnique({
        where: { id: serviceId, active: true },
    });
    if (!service) {
        redirect("/rezervace");
    }

    // Read-only lookup first: nothing about the client may be written until
    // the slot is known to be bookable.
    const extraTimeMinutes =
        (await findClient(phone, name))?.extraTimeMinutes ?? 0;

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

    const client = await findOrCreateClient(phone, name, email);

    let bookingId: string;
    try {
        const booking = await createBooking({
            clientId: client.id,
            serviceId,
            date,
            startTime,
            source: "ONLINE",
            extraTimeMinutes,
        });
        bookingId = booking.id;
    } catch (error) {
        if (!isBookingSlotConflict(error)) throw error;
        redirect(
            await buildSlotConflictRedirect(
                date,
                [serviceId],
                startTime,
                extraTimeMinutes
            )
        );
    }

    after(() => notifyNewOnlineBooking({ id: bookingId }));
    redirect(`/rezervace/confirmed?id=${bookingId}`);
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

    const { names, phone, email } = parsedData.data;
    const { serviceIds, date, startTime } = parsedContext.data;

    if (names.length !== serviceIds.length) {
        redirect("/rezervace");
    }


    const services = await prisma.service.findMany({
        where: { id: { in: serviceIds }, active: true },
    });

    if (services.length !== new Set(serviceIds).size) {
        redirect("/rezervace");
    }

    // Only the main contact can have extra time - guests aren't Clients.
    const mainContactExtraMinutes =
        (await findClient(phone, names[0]))?.extraTimeMinutes ?? 0;

    const valid = await getAvailableSlots(
        date,
        serviceIds,
        mainContactExtraMinutes
    );
    if (!valid.includes(startTime)) {
        redirect(
            await buildSlotConflictRedirect(
                date,
                serviceIds,
                startTime,
                mainContactExtraMinutes
            )
        );
    }

    const client = await findOrCreateClient(phone, names[0], email);

    const people = names.map((name, i) => ({
        clientId: client.id,
        guestName: i === 0 ? undefined : name,
        extraTimeMinutes: i === 0 ? mainContactExtraMinutes : 0,
        serviceId: serviceIds[i],
    }));

    let groupId: string;
    try {
        const bookings = await createGroupBooking(people, date, startTime, "ONLINE");
        groupId = bookings[0].groupId!;
    } catch (error) {
        if (!isBookingSlotConflict(error)) throw error;
        redirect(
            await buildSlotConflictRedirect(
                date,
                serviceIds,
                startTime,
                mainContactExtraMinutes
            )
        );
    }

    after(() => notifyNewOnlineBooking({ groupId }));
    redirect(`/rezervace/confirmed?groupId=${groupId}`);
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
