import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "./prisma.ts";
import { createBooking } from "./create-booking.ts";
import { createGroupBooking } from "./create-group-booking.ts";
import { cancelBooking, cancelGroupBooking } from "./cancel-booking.ts";

describe("cancelBooking / cancelGroupBooking", () => {
    let clientIds: string[];
    let serviceId: number;
    const testDate = new Date("2099-07-01T00:00:00.000Z");

    beforeEach(async () => {
        const clients = await Promise.all(
            ["A", "B"].map((suffix) =>
                prisma.client.create({
                    data: { name: `Test Klient ${suffix}`, phone: "999999999" },
                })
            )
        );
        clientIds = clients.map((c) => c.id);

        const service = await prisma.service.create({
            data: { name: "Test Service", durationMinutes: 30, price: 100 },
        });
        serviceId = service.id;
    });

    afterEach(async () => {
        await prisma.booking.deleteMany({ where: { clientId: { in: clientIds } } });
        await prisma.client.deleteMany({ where: { id: { in: clientIds } } });
        await prisma.service.delete({ where: { id: serviceId } });
    });

    it("marks a single booking as CANCELLED", async () => {
        const booking = await createBooking({
            clientId: clientIds[0],
            serviceId,
            date: testDate,
            startTime: 540,
            source: "ONLINE",
        });

        const cancelled = await cancelBooking(booking.id);

        expect(cancelled.status).toBe("CANCELLED");
    });

    it("cancels every CONFIRMED booking in a group, and only that group", async () => {
        const group = await createGroupBooking(
            [
                { clientId: clientIds[0], extraTimeMinutes: 0, serviceId },
                { clientId: clientIds[1], extraTimeMinutes: 0, serviceId },
            ],
            testDate,
            540,
            "ONLINE"
        );
        const groupId = group[0].groupId!;

        const outsider = await createBooking({
            clientId: clientIds[0],
            serviceId,
            date: testDate,
            startTime: 720,
            source: "ONLINE",
        });

        await cancelGroupBooking(groupId);

        const groupAfter = await prisma.booking.findMany({ where: { groupId } });
        expect(groupAfter.every((b) => b.status === "CANCELLED")).toBe(true);

        const outsiderAfter = await prisma.booking.findUniqueOrThrow({
            where: { id: outsider.id },
        });
        expect(outsiderAfter.status).toBe("CONFIRMED");
    });
});
