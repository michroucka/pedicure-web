import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "./prisma.ts";
import { getAvailableDaysInRange } from "./get-available-days-in-range.ts";

// dayOfWeek 0 (Sunday) exclusively — RecurringAvailability has no date
// column, only dayOfWeek, so two test files touching the same dayOfWeek
// race when run in parallel regardless of which calendar dates they
// otherwise use. get-available-slots.test.ts owns Saturday (dayOfWeek 6);
// this file never touches it. A single-day range is enough to prove
// inclusion/exclusion without needing a second "empty" comparison day on
// some other (potentially colliding) dayOfWeek.
const SUNDAY = new Date(Date.UTC(2099, 9, 4)); // 2099-10-04
const RANGE = { from: SUNDAY, to: SUNDAY };

describe("getAvailableDaysInRange", () => {
    let serviceId: number;
    let clientId: string | undefined;

    beforeEach(async () => {
        const service = await prisma.service.create({
            data: { name: "Test Service 30", durationMinutes: 30, price: 100 },
        });
        serviceId = service.id;
        clientId = undefined;
    });

    afterEach(async () => {
        await prisma.booking.deleteMany({ where: { date: SUNDAY } });
        if (clientId) {
            await prisma.client.delete({ where: { id: clientId } });
        }
        await prisma.availabilityException.deleteMany({
            where: { date: SUNDAY },
        });
        await prisma.recurringAvailability.deleteMany({
            where: { dayOfWeek: 0 },
        });
        await prisma.service.delete({ where: { id: serviceId } });
    });

    it("includes the day when it has recurring availability", async () => {
        await prisma.recurringAvailability.create({
            data: { dayOfWeek: 0, startTime: 540, endTime: 570 },
        });

        const days = await getAvailableDaysInRange(RANGE, [serviceId]);

        expect(days.map((d) => d.getTime())).toEqual([SUNDAY.getTime()]);
    });

    it("includes a day opened purely by an EXTRA_OPEN exception", async () => {
        await prisma.availabilityException.create({
            data: {
                date: SUNDAY,
                type: "EXTRA_OPEN",
                startTime: 540,
                endTime: 570,
            },
        });

        const days = await getAvailableDaysInRange(RANGE, [serviceId]);

        expect(days.map((d) => d.getTime())).toEqual([SUNDAY.getTime()]);
    });

    it("excludes a day fully closed by a BLOCKED exception", async () => {
        await prisma.recurringAvailability.create({
            data: { dayOfWeek: 0, startTime: 540, endTime: 570 },
        });
        await prisma.availabilityException.create({
            data: {
                date: SUNDAY,
                type: "BLOCKED",
                startTime: 540,
                endTime: 570,
            },
        });

        const days = await getAvailableDaysInRange(RANGE, [serviceId]);

        expect(days).toEqual([]);
    });

    it("excludes a day fully booked, but a cancelled booking doesn't count", async () => {
        await prisma.recurringAvailability.create({
            data: { dayOfWeek: 0, startTime: 540, endTime: 570 },
        });
        const client = await prisma.client.create({
            data: { name: "Test Klient", phone: "999999999" },
        });
        clientId = client.id;
        const booking = await prisma.booking.create({
            data: {
                clientId: client.id,
                serviceId,
                date: SUNDAY,
                startTime: 540,
                endTime: 570,
                status: "CONFIRMED",
                source: "ONLINE",
                cancelToken: crypto.randomUUID(),
            },
        });

        const fullyBooked = await getAvailableDaysInRange(RANGE, [serviceId]);
        expect(fullyBooked).toEqual([]);

        await prisma.booking.update({
            where: { id: booking.id },
            data: { status: "CANCELLED" },
        });

        const afterCancel = await getAvailableDaysInRange(RANGE, [serviceId]);
        expect(afterCancel.map((d) => d.getTime())).toEqual([SUNDAY.getTime()]);
    });
});
