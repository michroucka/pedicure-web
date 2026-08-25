import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "./prisma.ts";
import { createBooking } from "./create-booking.ts";
import { cancelBooking } from "./cancel-booking.ts";

// Runs against the isolated Neon "test" branch (see .env.test / package.json's
// pretest + test scripts) — real rows get committed here, not rolled back,
// because cancelBooking/moveBooking manage their own internal transactions
// against the shared `prisma` singleton rather than accepting an injectable
// client, so a single outer rollback-transaction can't wrap a whole
// multi-call scenario. Safe here since this branch only ever holds test data.
describe("booking slot uniqueness", () => {
    let clientId: string;
    let serviceId: number;
    const testDate = new Date("2099-06-15T00:00:00.000Z");

    beforeEach(async () => {
        const client = await prisma.client.create({
            data: { name: "Test Klient", phone: "999999999" },
        });
        clientId = client.id;

        const service = await prisma.service.create({
            data: { name: "Test Service", durationMinutes: 30, price: 100 },
        });
        serviceId = service.id;
    });

    afterEach(async () => {
        await prisma.booking.deleteMany({ where: { clientId } });
        await prisma.client.delete({ where: { id: clientId } });
        await prisma.service.delete({ where: { id: serviceId } });
    });

    it("allows a new confirmed booking at a slot whose previous booking was cancelled", async () => {
        const first = await createBooking({
            clientId,
            serviceId,
            date: testDate,
            startTime: 600,
            source: "ONLINE",
        });
        await cancelBooking(first.id);

        const second = await createBooking({
            clientId,
            serviceId,
            date: testDate,
            startTime: 600,
            source: "ONLINE",
        });

        expect(second.status).toBe("CONFIRMED");
    });

    it("rejects a second confirmed booking at an already-confirmed slot", async () => {
        await createBooking({
            clientId,
            serviceId,
            date: testDate,
            startTime: 660,
            source: "ONLINE",
        });

        await expect(
            createBooking({
                clientId,
                serviceId,
                date: testDate,
                startTime: 660,
                source: "ONLINE",
            })
        ).rejects.toMatchObject({ code: "P2002" });
    });
});
