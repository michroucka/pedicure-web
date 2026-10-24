import {
    afterAll,
    afterEach,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";
import { prisma } from "./prisma.ts";
import { getAvailableDaysInRange } from "./get-available-days-in-range.ts";
import { HORIZON_DAYS } from "./booking-horizon.ts";
import { addUtcDays } from "./utils.ts";

// dayOfWeek 0 (Sunday) exclusively — RecurringAvailability has no date
// column, only dayOfWeek, so two test files touching the same dayOfWeek
// race when run in parallel regardless of which calendar dates they
// otherwise use. get-available-slots.test.ts owns Saturday (dayOfWeek 6);
// this file never touches it. A single-day range is enough to prove
// inclusion/exclusion without needing a second "empty" comparison day on
// some other (potentially colliding) dayOfWeek.
const SUNDAY = new Date(Date.UTC(2099, 9, 4)); // 2099-10-04
const RANGE = { from: SUNDAY, to: SUNDAY };
// The online booking horizon is counted from "today" - pretend today is a
// few weeks before the far-future test dates so they're bookable.
const FAKE_NOW = new Date("2099-08-01T10:00:00.000Z");

describe("getAvailableDaysInRange", () => {
    beforeAll(() => {
        // Only Date - faking timers would stall the DB client.
        vi.useFakeTimers({ toFake: ["Date"] });
        vi.setSystemTime(FAKE_NOW);
    });

    afterAll(() => {
        vi.useRealTimers();
    });

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

    it("excludes a day past the online booking horizon", async () => {
        await prisma.recurringAvailability.create({
            data: { dayOfWeek: 0, startTime: 540, endTime: 600 },
        });
        vi.setSystemTime(addUtcDays(SUNDAY, -(HORIZON_DAYS + 2)));

        try {
            expect(await getAvailableDaysInRange(RANGE, [serviceId])).toEqual(
                []
            );
        } finally {
            vi.setSystemTime(FAKE_NOW);
        }
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

    it("ignores excluded bookings, so a day filled only by them stays available", async () => {
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

        const days = await getAvailableDaysInRange(RANGE, [serviceId], 0, {
            excludeBookingIds: [booking.id],
        });

        expect(days.map((d) => d.getTime())).toEqual([SUNDAY.getTime()]);
    });

    it("counts the same service once per person in a group", async () => {
        // 30 min window — fits one 30 min service, not two people with it
        await prisma.recurringAvailability.create({
            data: { dayOfWeek: 0, startTime: 540, endTime: 570 },
        });

        const days = await getAvailableDaysInRange(RANGE, [
            serviceId,
            serviceId,
        ]);

        expect(days).toEqual([]);
    });
});
