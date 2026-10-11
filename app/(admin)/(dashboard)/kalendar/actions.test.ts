import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma.ts";
import { createBooking } from "@/lib/create-booking.ts";
import { createGroupBooking } from "@/lib/create-group-booking.ts";
import {
    createManualBookingAction,
    getMoveSlotsAction,
    updateBookingAction,
} from "./actions.ts";

// revalidatePath needs a Next.js request context.
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

// outsideHours: true throughout — same reason as move-booking.test.ts: it
// only checks overlap with other bookings, not the RecurringAvailability
// this branch inherited from production.
const DATE_STR = "2099-11-02";
const DATE = new Date(`${DATE_STR}T00:00:00.000Z`);

function uniquePhone(): string {
    return `7${Math.floor(10_000_000 + Math.random() * 89_999_999)}`;
}

describe("kalendar actions", () => {
    let phone: string;
    let serviceIds: number[];

    beforeEach(async () => {
        phone = uniquePhone();
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
        const clients = await prisma.client.findMany({ where: { phone } });
        const clientIds = clients.map((c) => c.id);
        await prisma.booking.deleteMany({
            where: { OR: [{ clientId: { in: clientIds } }, { serviceId: { in: serviceIds } }] },
        });
        await prisma.client.deleteMany({ where: { id: { in: clientIds } } });
        await prisma.service.deleteMany({ where: { id: { in: serviceIds } } });
    });

    async function bookingsForPhone() {
        return prisma.booking.findMany({
            where: { client: { phone }, status: "CONFIRMED" },
            include: { client: true },
            orderBy: { startTime: "asc" },
        });
    }

    describe("createManualBookingAction", () => {
        it("creates one client for a group and stores the others as guests", async () => {
            const result = await createManualBookingAction({
                phone,
                people: [
                    { name: "Berankovi", serviceId: serviceIds[0], extraTimeMinutes: 0 },
                    { name: "Berankovi", serviceId: serviceIds[0], extraTimeMinutes: 0 },
                    { name: "Eva", serviceId: serviceIds[1], extraTimeMinutes: 0 },
                ],
                dateStr: DATE_STR,
                startTime: 540,
                source: "PHONE",
                outsideHours: true,
            });

            expect(result).toEqual({ ok: true });
            expect(await prisma.client.count({ where: { phone } })).toBe(1);
            const bookings = await bookingsForPhone();
            expect(bookings.map((b) => b.guestName)).toEqual([null, "Berankovi", "Eva"]);
            expect(new Set(bookings.map((b) => b.groupId)).size).toBe(1);
        });

        it("stores per-person extra time and writes the main contact's back to the client", async () => {
            await createManualBookingAction({
                phone,
                people: [
                    { name: "Jana Testová", serviceId: serviceIds[0], extraTimeMinutes: 15 },
                    { name: "Eva Host", serviceId: serviceIds[0], extraTimeMinutes: 10 },
                ],
                dateStr: DATE_STR,
                startTime: 540,
                source: "PHONE",
                outsideHours: true,
            });

            const bookings = await bookingsForPhone();
            expect(bookings.map((b) => b.extraTimeMinutes)).toEqual([15, 10]);
            expect(bookings.map((b) => [b.startTime, b.endTime])).toEqual([
                [540, 585],
                [585, 625],
            ]);
            const client = await prisma.client.findFirstOrThrow({ where: { phone } });
            expect(client.extraTimeMinutes).toBe(15); // guest's 10 not written anywhere
        });

        it("overwrites an existing client's extra time with the value from the form", async () => {
            await prisma.client.create({
                data: { name: "Jana Testová", phone, extraTimeMinutes: 15 },
            });

            await createManualBookingAction({
                phone,
                people: [{ name: "Jana Testová", serviceId: serviceIds[0], extraTimeMinutes: 30 }],
                dateStr: DATE_STR,
                startTime: 540,
                source: "PHONE",
                outsideHours: true,
            });

            const client = await prisma.client.findFirstOrThrow({ where: { phone } });
            expect(client.extraTimeMinutes).toBe(30);
        });

        it("does not touch the client's extra time when the slot is rejected", async () => {
            await prisma.client.create({
                data: { name: "Jana Testová", phone, extraTimeMinutes: 15 },
            });
            const other = await prisma.client.create({
                data: { name: "Jiný", phone: uniquePhone() },
            });
            await createBooking({
                clientId: other.id,
                serviceId: serviceIds[0],
                date: DATE,
                startTime: 540,
                source: "PHONE",
            });

            const result = await createManualBookingAction({
                phone,
                people: [{ name: "Jana Testová", serviceId: serviceIds[0], extraTimeMinutes: 30 }],
                dateStr: DATE_STR,
                startTime: 540,
                source: "PHONE",
                outsideHours: true,
            });

            expect(result.ok).toBe(false);
            const client = await prisma.client.findFirstOrThrow({ where: { phone } });
            expect(client.extraTimeMinutes).toBe(15);
            await prisma.booking.deleteMany({ where: { clientId: other.id } });
            await prisma.client.delete({ where: { id: other.id } });
        });

        it("counts a service once per person in the custom-time overlap check", async () => {
            // 2x 30 min from 9:00 = until 10:00 — collides with a booking at
            // 9:45; counting the shared service only once (9:00-9:30)
            // would wrongly let it through
            const other = await prisma.client.create({
                data: { name: "Jiný", phone: uniquePhone() },
            });
            await createBooking({
                clientId: other.id,
                serviceId: serviceIds[0],
                date: DATE,
                startTime: 585,
                source: "PHONE",
            });

            const result = await createManualBookingAction({
                phone,
                people: [
                    { name: "A", serviceId: serviceIds[0], extraTimeMinutes: 0 },
                    { name: "B", serviceId: serviceIds[0], extraTimeMinutes: 0 },
                ],
                dateStr: DATE_STR,
                startTime: 540,
                source: "PHONE",
                outsideHours: true,
            });

            expect(result.ok).toBe(false);
            await prisma.booking.deleteMany({ where: { clientId: other.id } });
            await prisma.client.delete({ where: { id: other.id } });
        });

        it("sanitizes a nonsensical extra time from the form", async () => {
            await createManualBookingAction({
                phone,
                people: [{ name: "Jana Testová", serviceId: serviceIds[0], extraTimeMinutes: -20 }],
                dateStr: DATE_STR,
                startTime: 540,
                source: "PHONE",
                outsideHours: true,
            });

            const [booking] = await bookingsForPhone();
            expect(booking.extraTimeMinutes).toBe(0);
            expect(booking.endTime).toBe(570);
        });
    });

    describe("updateBookingAction", () => {
        async function createGroup() {
            const client = await prisma.client.create({
                data: { name: "Jana Beránková", phone },
            });
            const group = await createGroupBooking(
                [
                    { clientId: client.id, extraTimeMinutes: 0, serviceId: serviceIds[0] },
                    { clientId: client.id, guestName: "Eva", extraTimeMinutes: 0, serviceId: serviceIds[0] },
                    { clientId: client.id, guestName: "Petr", extraTimeMinutes: 0, serviceId: serviceIds[0] },
                ],
                DATE,
                540,
                "PHONE"
            );
            return { client, group };
        }

        it("renames guests on their bookings, never the shared main client (regression)", async () => {
            const { client, group } = await createGroup();
            const tokensBefore = group.map((b) => b.cancelToken);

            const result = await updateBookingAction({
                groupId: group[0].groupId,
                people: [
                    { bookingId: group[0].id, name: "Jana Beránková", serviceId: serviceIds[0], extraTimeMinutes: 0 },
                    { bookingId: group[1].id, name: "Eva Beránková", serviceId: serviceIds[0], extraTimeMinutes: 0 },
                    { bookingId: group[2].id, name: "Petr Beránek", serviceId: serviceIds[0], extraTimeMinutes: 0 },
                ],
                phone,
                note: "",
                dateStr: DATE_STR,
                startTime: 540,
            });

            expect(result).toEqual({ ok: true });
            const after = await prisma.client.findUniqueOrThrow({ where: { id: client.id } });
            expect(after.name).toBe("Jana Beránková");
            const bookings = await bookingsForPhone();
            expect(bookings.map((b) => b.guestName)).toEqual([null, "Eva Beránková", "Petr Beránek"]);
            // a name fix alone doesn't move the bookings
            expect(bookings.map((b) => b.cancelToken)).toEqual(tokensBefore);
        });

        it("renames the main contact on the client", async () => {
            const { client, group } = await createGroup();

            await updateBookingAction({
                groupId: group[0].groupId,
                people: [
                    { bookingId: group[0].id, name: "Jana Nová", serviceId: serviceIds[0], extraTimeMinutes: 0 },
                    { bookingId: group[1].id, name: "Eva", serviceId: serviceIds[0], extraTimeMinutes: 0 },
                    { bookingId: group[2].id, name: "Petr", serviceId: serviceIds[0], extraTimeMinutes: 0 },
                ],
                phone,
                note: "",
                dateStr: DATE_STR,
                startTime: 540,
            });

            const after = await prisma.client.findUniqueOrThrow({ where: { id: client.id } });
            expect(after.name).toBe("Jana Nová");
        });

        it("re-lays the group out when a guest's extra time changes, keeping names", async () => {
            const { group } = await createGroup();

            const result = await updateBookingAction({
                groupId: group[0].groupId,
                people: [
                    { bookingId: group[0].id, name: "Jana Beránková", serviceId: serviceIds[0], extraTimeMinutes: 0 },
                    { bookingId: group[1].id, name: "Eva", serviceId: serviceIds[0], extraTimeMinutes: 15 },
                    { bookingId: group[2].id, name: "Petr", serviceId: serviceIds[0], extraTimeMinutes: 0 },
                ],
                phone,
                note: "",
                dateStr: DATE_STR,
                startTime: 540,
                outsideHours: true,
            });

            expect(result).toEqual({ ok: true });
            const bookings = await bookingsForPhone();
            expect(bookings.map((b) => b.guestName)).toEqual([null, "Eva", "Petr"]);
            expect(bookings.map((b) => b.extraTimeMinutes)).toEqual([0, 15, 0]);
            expect(bookings.map((b) => [b.startTime, b.endTime])).toEqual([
                [540, 570],
                [570, 615],
                [615, 645],
            ]);
        });

        it("changes a solo booking's extra time", async () => {
            const client = await prisma.client.create({ data: { name: "Jana", phone } });
            const booking = await createBooking({
                clientId: client.id,
                serviceId: serviceIds[0],
                date: DATE,
                startTime: 540,
                source: "PHONE",
            });

            await updateBookingAction({
                groupId: null,
                people: [{ bookingId: booking.id, name: "Jana", serviceId: serviceIds[0], extraTimeMinutes: 20 }],
                phone,
                note: "",
                dateStr: DATE_STR,
                startTime: 540,
                outsideHours: true,
            });

            const [moved] = await bookingsForPhone();
            expect(moved.extraTimeMinutes).toBe(20);
            expect(moved.endTime).toBe(590);
        });
    });

    describe("getMoveSlotsAction", () => {
        it("uses the unsaved extra time override when previewing slots", async () => {
            const client = await prisma.client.create({ data: { name: "Jana", phone } });
            const booking = await createBooking({
                clientId: client.id,
                serviceId: serviceIds[0],
                date: DATE,
                startTime: 540,
                source: "PHONE",
            });

            const withoutExtra = await getMoveSlotsAction(booking.id, null, DATE_STR);
            // longer than any real opening window — nothing can fit
            const withHugeExtra = await getMoveSlotsAction(
                booking.id,
                null,
                DATE_STR,
                undefined,
                [24 * 60]
            );

            // DATE is a Monday — the inherited RecurringAvailability covers
            // every weekday (see sprava/[token]/actions.test.ts), so the
            // empty result really comes from the override
            expect(withoutExtra.length).toBeGreaterThan(0);
            expect(withHugeExtra).toEqual([]);
        });
    });
});
