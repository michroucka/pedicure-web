import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma.ts";
import { createBooking } from "@/lib/create-booking.ts";
import { findOrCreateClient } from "@/lib/find-or-create-client.ts";
import { deleteClientAction, updateClientAction } from "./actions.ts";

// revalidatePath needs a Next.js request context.
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

function uniquePhone(): string {
    return `7${Math.floor(10_000_000 + Math.random() * 89_999_999)}`;
}

describe("klienti actions", () => {
    let phone: string;
    let serviceId: number;

    beforeEach(async () => {
        phone = uniquePhone();
        const service = await prisma.service.create({
            data: { name: "Test Service 30", durationMinutes: 30, price: 100 },
        });
        serviceId = service.id;
    });

    afterEach(async () => {
        const clients = await prisma.client.findMany({ where: { phone } });
        const clientIds = clients.map((c) => c.id);
        await prisma.booking.deleteMany({ where: { clientId: { in: clientIds } } });
        await prisma.client.deleteMany({ where: { id: { in: clientIds } } });
        await prisma.service.delete({ where: { id: serviceId } });
    });

    describe("deleteClientAction", () => {
        it("really deletes a client without any booking", async () => {
            const client = await prisma.client.create({ data: { name: "Překlep", phone } });

            await deleteClientAction(client.id);

            expect(await prisma.client.findUnique({ where: { id: client.id } })).toBeNull();
        });

        it("only hides a client with bookings, keeping the bookings untouched", async () => {
            const client = await prisma.client.create({ data: { name: "Jana", phone } });
            const booking = await createBooking({
                clientId: client.id,
                serviceId,
                date: new Date("2099-12-10T00:00:00.000Z"),
                startTime: 540,
                source: "PHONE",
            });

            await deleteClientAction(client.id);

            const after = await prisma.client.findUniqueOrThrow({ where: { id: client.id } });
            expect(after.active).toBe(false);
            const bookingAfter = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
            expect(bookingAfter.status).toBe("CONFIRMED");
            expect(bookingAfter.clientId).toBe(client.id);
        });

        it("hides a client whose bookings are all cancelled too (history)", async () => {
            const client = await prisma.client.create({ data: { name: "Jana", phone } });
            const booking = await createBooking({
                clientId: client.id,
                serviceId,
                date: new Date("2099-12-10T00:00:00.000Z"),
                startTime: 540,
                source: "PHONE",
            });
            await prisma.booking.update({ where: { id: booking.id }, data: { status: "CANCELLED" } });

            await deleteClientAction(client.id);

            const after = await prisma.client.findUniqueOrThrow({ where: { id: client.id } });
            expect(after.active).toBe(false);
        });
    });

    describe("reactivation", () => {
        it("reactivates a hidden client matched by phone on a new booking, without a duplicate", async () => {
            const client = await prisma.client.create({
                data: { name: "Jana", phone, active: false },
            });

            const matched = await findOrCreateClient(phone, "Jana");

            expect(matched.id).toBe(client.id);
            expect(matched.active).toBe(true);
            expect(await prisma.client.count({ where: { phone } })).toBe(1);
        });

        it("reactivates a hidden client matched by name when there's no phone", async () => {
            const name = `Bez Telefonu ${phone}`;
            const client = await prisma.client.create({ data: { name, active: false } });

            const matched = await findOrCreateClient(undefined, name);

            expect(matched.id).toBe(client.id);
            expect(matched.active).toBe(true);
            await prisma.client.delete({ where: { id: client.id } });
        });

        it("does not reactivate a hidden client on a plain edit", async () => {
            const client = await prisma.client.create({
                data: { name: "Jana", phone, active: false },
            });

            await updateClientAction(client.id, {
                name: "Jana Nová",
                phone,
                email: "",
                extraTimeMinutes: 0,
                note: "",
            });

            const after = await prisma.client.findUniqueOrThrow({ where: { id: client.id } });
            expect(after.active).toBe(false);
        });
    });
});
