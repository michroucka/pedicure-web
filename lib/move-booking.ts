import { Booking } from "@/lib/generated/prisma/client.ts";
import { prisma } from "./prisma.ts";
import { createBooking } from "./create-booking.ts";
import { getAvailableSlots } from "./get-available-slots.ts";
import { hasOverlappingBooking } from "./check-booking-overlap.ts";
import { endsAfterMidnight, getCzechToday } from "./utils.ts";
import { isBookingSlotConflict } from "./booking-conflict-error.ts";
import { sumServiceDurations } from "./service-duration.ts";

export const PAST_MIDNIGHT_ERROR = "Rezervace by přesáhla půlnoc.";
export const ALREADY_CANCELLED_ERROR = "Rezervace už byla zrušena.";

export class SlotUnavailableError extends Error {
    constructor(message = "Zvolený termín už není volný.") {
        super(message);
    }
}

// The availability check inside the move transaction runs at READ
// COMMITTED, so a concurrent booking can still slip in – the DB constraints
// catch that, and the caller should see it as a slot that's no longer free.
function rethrowSlotConflict(error: unknown): never {
    if (isBookingSlotConflict(error)) throw new SlotUnavailableError();
    throw error;
}

// Move = cancel the old booking + create a new one (never edited in place),
// same convention as the planned client-facing magic-link reschedule.
export async function moveBooking(
    bookingId: string,
    newDate: Date,
    newStartTime: number,
    options: {
        outsideHours?: boolean;
        serviceId?: number;
        // Replaces the booking's extra time snapshot (admin edit dialog).
        extraTimeMinutes?: number;
        allowUnfillableGaps?: boolean;
    } = {}
): Promise<Booking> {
    return prisma
        .$transaction(async (tx) => {
            const booking = await tx.booking.findUniqueOrThrow({
                where: { id: bookingId },
            });

            if (booking.groupId) {
                throw new Error(
                    "Skupinovou rezervaci přesuň přes moveGroupBooking."
                );
            }
            // A stale edit dialog (booking cancelled meanwhile on another device)
            // must not bring it back by "moving" it.
            if (booking.status !== "CONFIRMED") {
                throw new SlotUnavailableError(ALREADY_CANCELLED_ERROR);
            }

            await tx.booking.update({
                where: { id: bookingId },
                data: { status: "CANCELLED" },
            });

            const serviceId = options.serviceId ?? booking.serviceId;
            const extraTimeMinutes =
                options.extraTimeMinutes ?? booking.extraTimeMinutes;

            // Checked after cancelling (inside the same transaction) so the
            // booking being moved never collides with its own old slot.
            if (options.outsideHours) {
                if (newDate.getTime() < getCzechToday().getTime()) {
                    throw new SlotUnavailableError();
                }
                const service = await tx.service.findUniqueOrThrow({
                    where: { id: serviceId },
                });
                const duration = service.durationMinutes + extraTimeMinutes;
                // A custom time skips the availability windows, which are what
                // normally keeps a booking inside the day.
                if (endsAfterMidnight(newStartTime, duration)) {
                    throw new SlotUnavailableError(PAST_MIDNIGHT_ERROR);
                }
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
                    [serviceId],
                    extraTimeMinutes,
                    {
                        allowToday: true,
                        db: tx,
                        allowUnfillableGaps: options.allowUnfillableGaps,
                    }
                );
                if (!validSlots.includes(newStartTime)) {
                    throw new SlotUnavailableError();
                }
            }

            return createBooking(
                {
                    clientId: booking.clientId,
                    guestName: booking.guestName,
                    serviceId,
                    date: newDate,
                    startTime: newStartTime,
                    source: booking.source,
                    extraTimeMinutes,
                },
                tx
            );
        })
        .catch(rethrowSlotConflict);
}

// Moves every booking in the group together, preserving each person's own
// extraTimeMinutes and re-laying them out sequentially from the new start —
// same allocation as createGroupBooking. `serviceOverrides` /
// `extraTimeOverrides` (bookingId -> new value) let the edit dialog change a
// person's service or extra time in the same step, since both change the
// group's length and so need the slot re-validated.
export async function moveGroupBooking(
    groupId: string,
    newDate: Date,
    newGroupStart: number,
    options: {
        outsideHours?: boolean;
        serviceOverrides?: Record<string, number>;
        extraTimeOverrides?: Record<string, number>;
        allowUnfillableGaps?: boolean;
    } = {}
): Promise<Booking[]> {
    return prisma
        .$transaction(async (tx) => {
            const bookings = await tx.booking.findMany({
                where: { groupId, status: "CONFIRMED" },
                orderBy: { startTime: "asc" },
            });

            if (bookings.length === 0) {
                throw new Error("Skupinová rezervace nenalezena.");
            }

            await tx.booking.updateMany({
                where: { groupId, status: "CONFIRMED" },
                data: { status: "CANCELLED" },
            });

            const serviceIds = bookings.map(
                (b) => options.serviceOverrides?.[b.id] ?? b.serviceId
            );
            const extraTimes = bookings.map(
                (b) => options.extraTimeOverrides?.[b.id] ?? b.extraTimeMinutes
            );
            const totalExtraMinutes = extraTimes.reduce((sum, m) => sum + m, 0);

            if (options.outsideHours) {
                if (newDate.getTime() < getCzechToday().getTime()) {
                    throw new SlotUnavailableError();
                }
                const services = await tx.service.findMany({
                    where: { id: { in: serviceIds } },
                });
                const groupDuration =
                    sumServiceDurations(serviceIds, services) +
                    totalExtraMinutes;
                if (endsAfterMidnight(newGroupStart, groupDuration)) {
                    throw new SlotUnavailableError(PAST_MIDNIGHT_ERROR);
                }
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
                const validSlots = await getAvailableSlots(
                    newDate,
                    serviceIds,
                    totalExtraMinutes,
                    {
                        allowToday: true,
                        db: tx,
                        allowUnfillableGaps: options.allowUnfillableGaps,
                    }
                );
                if (!validSlots.includes(newGroupStart)) {
                    throw new SlotUnavailableError();
                }
            }

            const created: Booking[] = [];
            let startTime = newGroupStart;

            for (let i = 0; i < bookings.length; i++) {
                const booking = bookings[i];
                const newBooking = await createBooking(
                    {
                        clientId: booking.clientId,
                        guestName: booking.guestName,
                        serviceId: serviceIds[i],
                        date: newDate,
                        startTime,
                        source: booking.source,
                        groupId,
                        extraTimeMinutes: extraTimes[i],
                    },
                    tx
                );
                startTime = newBooking.endTime;
                created.push(newBooking);
            }

            return created;
        })
        .catch(rethrowSlotConflict);
}
