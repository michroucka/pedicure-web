import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "./prisma";
import { createBooking } from "./create-booking";
import { checkOutsideHoursSlot } from "./check-booking-overlap";
import { addUtcDays, getCzechToday } from "./utils";

// Own date, not shared with other test files: the overlap check looks at
// every confirmed booking on the day, not only this file's.
describe("checkOutsideHoursSlot", () => {
    let clientId: string;
    let serviceId: number;
    const testDate = new Date("2099-09-01T00:00:00.000Z");

    beforeEach(async () => {
        const client = await prisma.client.create({
            data: { name: "Test Klient Overlap", phone: "999999998" },
        });
        clientId = client.id;

        const service = await prisma.service.create({
            data: { name: "Test Service 60", durationMinutes: 60, price: 100 },
        });
        serviceId = service.id;
    });

    afterEach(async () => {
        await prisma.booking.deleteMany({ where: { clientId } });
        await prisma.client.delete({ where: { id: clientId } });
        await prisma.service.delete({ where: { id: serviceId } });
    });

    it("accepts a free slot", async () => {
        expect(
            await checkOutsideHoursSlot(testDate, 600, [serviceId], 0)
        ).toBeNull();
    });

    it("accepts today", async () => {
        expect(
            await checkOutsideHoursSlot(getCzechToday(), 0, [serviceId], 0)
        ).not.toBe("past");
    });

    it("rejects a day in the past", async () => {
        const yesterday = addUtcDays(getCzechToday(), -1);
        expect(
            await checkOutsideHoursSlot(yesterday, 600, [serviceId], 0)
        ).toBe("past");
    });

    it("accepts a booking ending exactly at midnight", async () => {
        expect(
            await checkOutsideHoursSlot(testDate, 23 * 60, [serviceId], 0)
        ).toBeNull();
    });

    it("rejects a booking whose extra time pushes it past midnight", async () => {
        expect(
            await checkOutsideHoursSlot(testDate, 23 * 60, [serviceId], 5)
        ).toBe("pastMidnight");
    });

    it("counts the same service once per person", async () => {
        expect(
            await checkOutsideHoursSlot(
                testDate,
                22 * 60 + 30,
                [serviceId, serviceId],
                0
            )
        ).toBe("pastMidnight");
    });

    it("rejects a slot overlapping a confirmed booking", async () => {
        await createBooking({
            clientId,
            serviceId,
            date: testDate,
            startTime: 600,
            source: "PHONE",
        });

        expect(await checkOutsideHoursSlot(testDate, 630, [serviceId], 0)).toBe(
            "overlap"
        );
    });

    it("accepts a slot right after a booking and ignores cancelled ones", async () => {
        await createBooking({
            clientId,
            serviceId,
            date: testDate,
            startTime: 600,
            source: "PHONE",
        });
        const cancelled = await createBooking({
            clientId,
            serviceId,
            date: testDate,
            startTime: 700,
            source: "PHONE",
        });
        await prisma.booking.update({
            where: { id: cancelled.id },
            data: { status: "CANCELLED" },
        });

        expect(
            await checkOutsideHoursSlot(testDate, 660, [serviceId], 0)
        ).toBeNull();
    });
});
