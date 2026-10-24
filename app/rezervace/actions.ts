"use server";

import { prisma } from "@/lib/prisma.ts";
import { formatTime, normalizeForSearch } from "@/lib/utils.ts";
import {
    reloadClient,
    upsertMatchedClient,
} from "@/lib/find-or-create-client.ts";
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
import { verifyTurnstileToken } from "@/lib/turnstile.ts";
import { hasReachedOnlineBookingLimit } from "@/lib/online-booking-limit.ts";
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
async function notifyNewOnlineBooking(
    where: { id: string } | { groupId: string }
) {
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

function comparableName(name: string): string {
    return normalizeForSearch(name).trim().replace(/\s+/g, " ");
}

// The client's extra time as the public form may show it: only when both
// the phone and the name match (ignoring case, diacritics and extra
// spaces) - knowing someone's number alone mustn't reveal that they're a
// client, let alone that their visits take longer.
async function previewExtraMinutes(
    phone: string,
    name: string
): Promise<number> {
    const client = await findClient(phone, name);
    if (!client || comparableName(client.name) !== comparableName(name))
        return 0;
    return client.extraTimeMinutes;
}

// Back to the contact form with an error that's about the submission, not
// the slot (failed bot check, too many bookings on one contact).
// extraMinutes is what the form shows the person anyway (same phone+name
// rule as the preview), carried over so the page doesn't show the end time
// without it.
function detailsErrorUrl(
    slot: { date: Date; serviceIds: number[]; startTime: number },
    error: "verification" | "booking_limit",
    extraMinutes = 0
): string {
    const params = new URLSearchParams({
        date: slot.date.toISOString().slice(0, 10),
        services: slot.serviceIds.join(","),
        slot: String(slot.startTime),
        error,
    });
    if (extraMinutes > 0) params.set("extraMinutes", String(extraMinutes));
    return `/rezervace/details?${params.toString()}`;
}

// Both checks run before anything is written.
async function rejectAbusiveSubmission(
    turnstileToken: string | null | undefined,
    contact: { phone: string; email: string; name: string },
    slot: { date: Date; serviceIds: number[]; startTime: number }
): Promise<void> {
    // A request that fails the bot check gets no DB query at all - no
    // limit check, no client lookup for the redirect - so the check runs
    // first and alone.
    if (!(await verifyTurnstileToken(turnstileToken))) {
        redirect(detailsErrorUrl(slot, "verification"));
    }
    if (await hasReachedOnlineBookingLimit(contact.phone, contact.email)) {
        redirect(
            detailsErrorUrl(
                slot,
                "booking_limit",
                await previewExtraMinutes(contact.phone, contact.name)
            )
        );
    }
}

export async function submitBooking(
    context: { date: Date; serviceId: number; startTime: number },
    data: { name: string; phone: string; email: string },
    turnstileToken?: string | null
) {
    const parsedContext = soloContextSchema.safeParse(context);
    const parsedData = soloDataSchema.safeParse(data);
    if (!parsedContext.success || !parsedData.success) {
        redirect("/rezervace");
    }
    const { name, phone, email } = parsedData.data;
    const { serviceId, date, startTime } = parsedContext.data;

    await rejectAbusiveSubmission(
        turnstileToken,
        { phone, email, name },
        {
            date,
            serviceIds: [serviceId],
            startTime,
        }
    );

    const service = await prisma.service.findUnique({
        where: { id: serviceId, active: true },
    });
    if (!service) {
        redirect("/rezervace");
    }

    // Read-only lookup first: nothing about the client may be written until
    // the slot is known to be bookable.
    const matchedClient = await findClient(phone, name);
    const extraTimeMinutes = matchedClient?.extraTimeMinutes ?? 0;

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

    const client = await upsertMatchedClient(
        await reloadClient(matchedClient),
        phone,
        name,
        email
    );

    let booking: { id: string; cancelToken: string };
    try {
        booking = await createBooking({
            clientId: client.id,
            serviceId,
            date,
            startTime,
            source: "ONLINE",
            extraTimeMinutes,
        });
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

    after(() => notifyNewOnlineBooking({ id: booking.id }));
    redirect(`/rezervace/sprava/${booking.cancelToken}?created=1`);
}

export async function submitGroupBooking(
    context: { date: Date; serviceIds: number[]; startTime: number },
    data: { names: string[]; phone: string; email: string },
    turnstileToken?: string | null
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

    await rejectAbusiveSubmission(
        turnstileToken,
        { phone, email, name: names[0] },
        {
            date,
            serviceIds,
            startTime,
        }
    );

    const services = await prisma.service.findMany({
        where: { id: { in: serviceIds }, active: true },
    });

    if (services.length !== new Set(serviceIds).size) {
        redirect("/rezervace");
    }

    // Only the main contact can have extra time - guests aren't Clients.
    const matchedClient = await findClient(phone, names[0]);
    const mainContactExtraMinutes = matchedClient?.extraTimeMinutes ?? 0;

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

    const client = await upsertMatchedClient(
        await reloadClient(matchedClient),
        phone,
        names[0],
        email
    );

    const people = names.map((name, i) => ({
        clientId: client.id,
        guestName: i === 0 ? undefined : name,
        extraTimeMinutes: i === 0 ? mainContactExtraMinutes : 0,
        serviceId: serviceIds[i],
    }));

    let groupId: string;
    let cancelToken: string;
    try {
        const bookings = await createGroupBooking(
            people,
            date,
            startTime,
            "ONLINE"
        );
        groupId = bookings[0].groupId!;
        // Any member's token manages the whole group (getBookingGroupByToken).
        cancelToken = bookings[0].cancelToken;
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
    redirect(`/rezervace/sprava/${cancelToken}?created=1`);
}

// extraMinutes comes from the URL after an extra_time_conflict redirect
// (see buildSlotConflictRedirect) – the day picker has to use it too, not
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

// Extra time of the (main) contact only – group guests aren't Clients and
// always get 0, same as submitGroupBooking. Stricter than submit, which
// matches by phone only (see previewExtraMinutes): a differently written
// name just means the longer slot shows up after submit instead of here.
export async function getExtraMinutesAction(contact: {
    name: string;
    phone: string;
}): Promise<number> {
    const parsed = contactLookupSchema.safeParse(contact);
    if (!parsed.success) return 0;

    const { name, phone } = parsed.data;
    if (!name || !phone) return 0;

    return previewExtraMinutes(phone, name);
}

export async function getAvailableSlotsAction(
    date: Date,
    serviceIds: number[],
    extraMinutes: number = 0
): Promise<number[]> {
    // Called in the background by the slot picker – invalid input just
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
