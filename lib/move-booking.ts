import { Booking } from "@/lib/generated/prisma/client.ts";
import { prisma } from "./prisma.ts";
import { createBooking } from "./create-booking.ts";
import { getAvailableSlots } from "./get-available-slots.ts";
import { hasOverlappingBooking } from "./check-booking-overlap.ts";
import { getCzechToday } from "./utils.ts";

export class SlotUnavailableError extends Error {
    constructor() {
        super("Zvolený termín už není volný.");
    }
}

// Move = cancel the old booking + create a new one (never edited in place),
// same convention as the planned client-facing magic-link reschedule.
export async function moveBooking(
    bookingId: string,
    newDate: Date,
    newStartTime: number,
    options: { outsideHours?: boolean } = {}
): Promise<Booking> {
    return prisma.$transaction(async (tx) => {
        const booking = await tx.booking.findUniqueOrThrow({
            where: { id: bookingId },
            include: { client: true },
        });

        if (booking.groupId) {
            throw new Error(
                "Skupinovou rezervaci přesuň přes moveGroupBooking."
            );
        }

        await tx.booking.update({
            where: { id: bookingId },
            data: { status: "CANCELLED" },
        });

        // Checked after cancelling (inside the same transaction) so the
        // booking being moved never collides with its own old slot.
        if (options.outsideHours) {
            if (newDate.getTime() < getCzechToday().getTime()) {
                throw new SlotUnavailableError();
            }
            const duration = booking.endTime - booking.startTime;
            const overlaps = await hasOverlappingBooking(
                newDate,
                newStartTime,
                newStartTime + duration,
                { db: tx }
            );
            if (overlaps) {
                throw new SlotUnavailableError();
            }
        } else {
            const validSlots = await getAvailableSlots(
                newDate,
                [booking.serviceId],
                booking.client.extraTimeMinutes,
                { allowToday: true, db: tx }
            );
            if (!validSlots.includes(newStartTime)) {
                throw new SlotUnavailableError();
            }
        }

        return createBooking(
            {
                clientId: booking.clientId,
                serviceId: booking.serviceId,
                date: newDate,
                startTime: newStartTime,
                source: booking.source,
                reminderRequested: booking.reminderRequested,
                extraTimeMinutes: booking.client.extraTimeMinutes,
            },
            tx
        );
    });
}

// Moves every booking in the group together, preserving each person's own
// service/extraTimeMinutes and re-laying them out sequentially from the new
// start — same allocation as createGroupBooking.
export async function moveGroupBooking(
    groupId: string,
    newDate: Date,
    newGroupStart: number,
    options: { outsideHours?: boolean } = {}
): Promise<Booking[]> {
    return prisma.$transaction(async (tx) => {
        const bookings = await tx.booking.findMany({
            where: { groupId, status: "CONFIRMED" },
            include: { client: true },
            orderBy: { startTime: "asc" },
        });

        if (bookings.length === 0) {
            throw new Error("Skupinová rezervace nenalezena.");
        }

        await tx.booking.updateMany({
            where: { groupId, status: "CONFIRMED" },
            data: { status: "CANCELLED" },
        });

        if (options.outsideHours) {
            if (newDate.getTime() < getCzechToday().getTime()) {
                throw new SlotUnavailableError();
            }
            const groupDuration =
                bookings[bookings.length - 1].endTime - bookings[0].startTime;
            const overlaps = await hasOverlappingBooking(
                newDate,
                newGroupStart,
                newGroupStart + groupDuration,
                { db: tx }
            );
            if (overlaps) {
                throw new SlotUnavailableError();
            }
        } else {
            const serviceIds = bookings.map((b) => b.serviceId);
            const totalExtraMinutes = bookings.reduce(
                (sum, b) => sum + b.client.extraTimeMinutes,
                0
            );

            const validSlots = await getAvailableSlots(
                newDate,
                serviceIds,
                totalExtraMinutes,
                { allowToday: true, db: tx }
            );
            if (!validSlots.includes(newGroupStart)) {
                throw new SlotUnavailableError();
            }
        }

        const created: Booking[] = [];
        let startTime = newGroupStart;

        for (const booking of bookings) {
            const newBooking = await createBooking(
                {
                    clientId: booking.clientId,
                    serviceId: booking.serviceId,
                    date: newDate,
                    startTime,
                    source: booking.source,
                    groupId,
                    reminderRequested: booking.reminderRequested,
                    extraTimeMinutes: booking.client.extraTimeMinutes,
                },
                tx
            );
            startTime = newBooking.endTime;
            created.push(newBooking);
        }

        return created;
    });
}
