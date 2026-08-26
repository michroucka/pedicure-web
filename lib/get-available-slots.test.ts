import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "./prisma.ts";
import { getAvailableSlots } from "./get-available-slots.ts";

// Saturday, far enough in the future not to collide with anything real.
// Production only has recurring availability on weekdays (Mon-Fri), so
// Saturday starts genuinely empty on this branch — no inherited rows to
// account for. dayOfWeek/date scoping below (6 / this exact date) keeps
// cleanup from ever touching the real Mon-Fri rows this branch also
// inherited from production at fork time.
const SATURDAY = new Date(Date.UTC(2099, 8, 5));
const DAY_OF_WEEK = 6;

describe("getAvailableSlots", () => {
    let serviceId: number;
    // Tests run in parallel with other test files — a broad deleteMany by
    // name (like "Test Klient") can race with another file's fixture using
    // the same literal name, so this tracks exactly the client this test
    // created and cleans up only that one.
    let clientId: string | undefined;

    beforeEach(async () => {
        const service = await prisma.service.create({
            data: { name: "Test Service 30", durationMinutes: 30, price: 100 },
        });
        serviceId = service.id;
        clientId = undefined;
    });

    afterEach(async () => {
        await prisma.booking.deleteMany({ where: { date: SATURDAY } });
        if (clientId) {
            await prisma.client.delete({ where: { id: clientId } });
        }
        await prisma.availabilityException.deleteMany({
            where: { date: SATURDAY },
        });
        await prisma.recurringAvailability.deleteMany({
            where: { dayOfWeek: DAY_OF_WEEK },
        });
        await prisma.service.delete({ where: { id: serviceId } });
    });

    it("returns nothing for a day with no recurring availability", async () => {
        const slots = await getAvailableSlots(SATURDAY, [serviceId]);
        expect(slots).toEqual([]);
    });

    it("returns the single slot exactly filling a recurring window", async () => {
        await prisma.recurringAvailability.create({
            data: { dayOfWeek: DAY_OF_WEEK, startTime: 540, endTime: 570 }, // 09:00-09:30
        });

        const slots = await getAvailableSlots(SATURDAY, [serviceId]);
        expect(slots).toEqual([540]);
    });

    it("excludes a slot taken by a CONFIRMED booking", async () => {
        await prisma.recurringAvailability.create({
            data: { dayOfWeek: DAY_OF_WEEK, startTime: 540, endTime: 600 }, // 09:00-10:00
        });
        const client = await prisma.client.create({
            data: { name: "Test Klient", phone: "999999999" },
        });
        clientId = client.id;
        await prisma.booking.create({
            data: {
                clientId: client.id,
                serviceId,
                date: SATURDAY,
                startTime: 570,
                endTime: 600,
                status: "CONFIRMED",
                source: "ONLINE",
                cancelToken: crypto.randomUUID(),
            },
        });

        const slots = await getAvailableSlots(SATURDAY, [serviceId]);
        expect(slots).toEqual([540]); // only the 09:00-09:30 gap is left
    });

    it("does not let a CANCELLED booking block its old slot", async () => {
        await prisma.recurringAvailability.create({
            data: { dayOfWeek: DAY_OF_WEEK, startTime: 540, endTime: 600 }, // 09:00-10:00
        });
        const client = await prisma.client.create({
            data: { name: "Test Klient", phone: "999999999" },
        });
        clientId = client.id;
        await prisma.booking.create({
            data: {
                clientId: client.id,
                serviceId,
                date: SATURDAY,
                startTime: 570,
                endTime: 600,
                status: "CANCELLED",
                source: "ONLINE",
                cancelToken: crypto.randomUUID(),
            },
        });

        const slots = await getAvailableSlots(SATURDAY, [serviceId]);
        // Both edges of the now-fully-open 09:00-10:00 window must be free —
        // the grid point in between depends on the smallest active service
        // duration across the whole DB, which this test doesn't control.
        expect(slots).toEqual(expect.arrayContaining([540, 570]));
    });

    it("removes time blocked by a BLOCKED exception", async () => {
        await prisma.recurringAvailability.create({
            data: { dayOfWeek: DAY_OF_WEEK, startTime: 540, endTime: 600 }, // 09:00-10:00
        });
        await prisma.availabilityException.create({
            data: {
                date: SATURDAY,
                type: "BLOCKED",
                startTime: 540,
                endTime: 570,
            },
        });

        const slots = await getAvailableSlots(SATURDAY, [serviceId]);
        expect(slots).toEqual([570]);
    });

    it("adds time opened up by an EXTRA_OPEN exception", async () => {
        await prisma.availabilityException.create({
            data: {
                date: SATURDAY,
                type: "EXTRA_OPEN",
                startTime: 540,
                endTime: 570,
            },
        });

        const slots = await getAvailableSlots(SATURDAY, [serviceId]);
        expect(slots).toEqual([540]);
    });
});
