import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "./prisma.ts";
import { createBooking } from "./create-booking.ts";
import { createGroupBooking } from "./create-group-booking.ts";
import {
    moveBooking,
    moveGroupBooking,
    SlotUnavailableError,
} from "./move-booking.ts";

// outsideHours: true throughout — the normal path validates the target slot
// against RecurringAvailability, which this branch inherited from
// production at fork time and could change independently of these tests.
// outsideHours only checks direct overlap with other bookings, so these
// tests are self-contained.
describe("moveBooking / moveGroupBooking", () => {
    let clientIds: string[];
    let serviceIds: number[];
    const testDate = new Date("2099-08-01T00:00:00.000Z");
    const otherDate = new Date("2099-08-02T00:00:00.000Z");

    beforeEach(async () => {
        const clients = await Promise.all(
            ["A", "B"].map((suffix) =>
                prisma.client.create({
                    data: { name: `Test Klient ${suffix}`, phone: "999999999" },
                })
            )
        );
        clientIds = clients.map((c) => c.id);

        const services = await Promise.all([
            prisma.service.create({
                data: { name: "Test Service 30", durationMinutes: 30, price: 100 },
            }),
            prisma.service.create({
                data: { name: "Test Service 45", durationMinutes: 45, price: 150 },
            }),
        ]);
        serviceIds = services.map((s) => s.id);
    });

    afterEach(async () => {
        await prisma.booking.deleteMany({ where: { clientId: { in: clientIds } } });
        await prisma.client.deleteMany({ where: { id: { in: clientIds } } });
        await prisma.service.deleteMany({ where: { id: { in: serviceIds } } });
    });

    it("cancels the old booking and creates a new one with a fresh cancelToken", async () => {
        const original = await createBooking({
            clientId: clientIds[0],
            serviceId: serviceIds[0],
            date: testDate,
            startTime: 540,
            source: "ONLINE",
        });

        const moved = await moveBooking(original.id, otherDate, 600, {
            outsideHours: true,
        });

        const originalAfter = await prisma.booking.findUniqueOrThrow({
            where: { id: original.id },
        });
        expect(originalAfter.status).toBe("CANCELLED");

        expect(moved.status).toBe("CONFIRMED");
        expect(moved.clientId).toBe(original.clientId);
        expect(moved.serviceId).toBe(original.serviceId);
        expect(moved.date.getTime()).toBe(otherDate.getTime());
        expect(moved.startTime).toBe(600);
        expect(moved.cancelToken).not.toBe(original.cancelToken);
    });

    it("throws SlotUnavailableError when the target overlaps another booking", async () => {
        const original = await createBooking({
            clientId: clientIds[0],
            serviceId: serviceIds[0],
            date: testDate,
            startTime: 540,
            source: "ONLINE",
        });
        await createBooking({
            clientId: clientIds[1],
            serviceId: serviceIds[0],
            date: otherDate,
            startTime: 600,
            source: "ONLINE",
        });

        await expect(
            moveBooking(original.id, otherDate, 600, { outsideHours: true })
        ).rejects.toBeInstanceOf(SlotUnavailableError);
    });

    it("moves every member of a group together, preserving groupId and each person's own service", async () => {
        const group = await createGroupBooking(
            [
                { clientId: clientIds[0], extraTimeMinutes: 0, serviceId: serviceIds[0] }, // 30 min
                { clientId: clientIds[1], extraTimeMinutes: 0, serviceId: serviceIds[1] }, // 45 min
            ],
            testDate,
            540,
            "ONLINE"
        );
        const groupId = group[0].groupId!;
        const originalIds = group.map((b) => b.id);

        const moved = await moveGroupBooking(groupId, otherDate, 600, {
            outsideHours: true,
        });

        // moveGroupBooking keeps the same groupId for the new bookings too,
        // so a query by groupId alone would now return old + new mixed —
        // check the original rows by id instead.
        const originalsAfter = await prisma.booking.findMany({
            where: { id: { in: originalIds } },
        });
        expect(originalsAfter.every((b) => b.status === "CANCELLED")).toBe(true);

        expect(moved.every((b) => b.groupId === groupId)).toBe(true);
        expect(moved[0].serviceId).toBe(serviceIds[0]);
        expect(moved[0].startTime).toBe(600);
        expect(moved[0].endTime).toBe(630); // 30 min
        expect(moved[1].serviceId).toBe(serviceIds[1]);
        expect(moved[1].startTime).toBe(630); // laid out right after the first
        expect(moved[1].endTime).toBe(675); // 45 min
    });
});
