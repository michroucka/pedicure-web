import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "./prisma.ts";
import { createBooking } from "./create-booking.ts";
import { createGroupBooking } from "./create-group-booking.ts";

describe("createBooking / createGroupBooking", () => {
    let clientId: string;
    let serviceIds: number[];
    const testDate = new Date("2099-09-01T00:00:00.000Z");

    beforeEach(async () => {
        const client = await prisma.client.create({
            data: { name: "Test Hlavní Kontakt", phone: "999999998" },
        });
        clientId = client.id;

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
        await prisma.booking.deleteMany({ where: { clientId } });
        await prisma.client.delete({ where: { id: clientId } });
        await prisma.service.deleteMany({ where: { id: { in: serviceIds } } });
    });

    it("stores no guest and zero extra time by default", async () => {
        const booking = await createBooking({
            clientId,
            serviceId: serviceIds[0],
            date: testDate,
            startTime: 540,
            source: "ONLINE",
        });

        expect(booking.guestName).toBeNull();
        expect(booking.extraTimeMinutes).toBe(0);
        expect(booking.endTime).toBe(570);
    });

    it("stores the extraTimeMinutes snapshot and adds it to endTime", async () => {
        const booking = await createBooking({
            clientId,
            serviceId: serviceIds[0],
            date: testDate,
            startTime: 540,
            source: "PHONE",
            extraTimeMinutes: 15,
        });

        expect(booking.extraTimeMinutes).toBe(15);
        expect(booking.endTime).toBe(585); // 30 + 15
    });

    it("stores each group member's own guestName and extra time under one client", async () => {
        const group = await createGroupBooking(
            [
                { clientId, extraTimeMinutes: 15, serviceId: serviceIds[0] },
                { clientId, guestName: "Eva Host", extraTimeMinutes: 0, serviceId: serviceIds[1] },
                { clientId, guestName: "Petr Host", extraTimeMinutes: 10, serviceId: serviceIds[0] },
            ],
            testDate,
            540,
            "ONLINE"
        );

        expect(group.map((b) => b.clientId)).toEqual([clientId, clientId, clientId]);
        expect(group.map((b) => b.guestName)).toEqual([null, "Eva Host", "Petr Host"]);
        expect(group.map((b) => b.extraTimeMinutes)).toEqual([15, 0, 10]);
        expect(new Set(group.map((b) => b.groupId)).size).toBe(1);

        // laid out back to back, each with only its own extra time
        expect(group.map((b) => [b.startTime, b.endTime])).toEqual([
            [540, 585], // 30 + 15
            [585, 630], // 45 + 0
            [630, 670], // 30 + 10
        ]);
    });
});
