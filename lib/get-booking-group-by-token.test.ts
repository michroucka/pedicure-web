import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "./prisma.ts";
import { createBooking } from "./create-booking.ts";
import { createGroupBooking } from "./create-group-booking.ts";
import { moveGroupBooking } from "./move-booking.ts";
import { cancelBooking } from "./cancel-booking.ts";
import { getBookingGroupByToken } from "./get-booking-group-by-token.ts";

// outsideHours: true for moves – same reason as move-booking.test.ts: these
// tests are about which rows the token resolves to, not availability.
describe("getBookingGroupByToken", () => {
    let clientId: string;
    let serviceId: number;
    const testDate = new Date("2099-12-01T00:00:00.000Z");

    beforeEach(async () => {
        const client = await prisma.client.create({
            data: { name: "Test Token Klient", phone: "999999997" },
        });
        clientId = client.id;
        const service = await prisma.service.create({
            data: { name: "Test Service 30", durationMinutes: 30, price: 100 },
        });
        serviceId = service.id;
    });

    afterEach(async () => {
        await prisma.booking.deleteMany({ where: { clientId } });
        await prisma.client.delete({ where: { id: clientId } });
        await prisma.service.delete({ where: { id: serviceId } });
    });

    async function createGroup() {
        return createGroupBooking(
            [
                { clientId, extraTimeMinutes: 0, serviceId },
                {
                    clientId,
                    guestName: "Eva Host",
                    extraTimeMinutes: 0,
                    serviceId,
                },
            ],
            testDate,
            540,
            "ONLINE"
        );
    }

    it("returns null for an unknown token", async () => {
        expect(await getBookingGroupByToken("does-not-exist")).toBeNull();
    });

    it("returns a solo booking on its own", async () => {
        const booking = await createBooking({
            clientId,
            serviceId,
            date: testDate,
            startTime: 540,
            source: "ONLINE",
        });

        const result = await getBookingGroupByToken(booking.cancelToken);

        expect(result?.map((b) => b.id)).toEqual([booking.id]);
    });

    it("returns only the current members after the group was moved later (regression)", async () => {
        // moved to a later time, the cancelled originals sort first – the
        // manage page then showed "Rezervace zrušena" for a live booking
        const group = await createGroup();
        const moved = await moveGroupBooking(group[0].groupId!, testDate, 660, {
            outsideHours: true,
        });

        const result = await getBookingGroupByToken(moved[0].cancelToken);

        expect(result?.map((b) => b.id)).toEqual(moved.map((b) => b.id));
        expect(result?.every((b) => b.status === "CONFIRMED")).toBe(true);
    });

    it("resolves any current member's token to the same group after repeated moves", async () => {
        const group = await createGroup();
        const first = await moveGroupBooking(group[0].groupId!, testDate, 660, {
            outsideHours: true,
        });
        const second = await moveGroupBooking(
            group[0].groupId!,
            testDate,
            600,
            {
                outsideHours: true,
            }
        );

        const viaGuest = await getBookingGroupByToken(second[1].cancelToken);

        expect(viaGuest?.map((b) => b.id)).toEqual(second.map((b) => b.id));
        expect(viaGuest?.map((b) => b.guestName)).toEqual([null, "Eva Host"]);
        // 2 originals + 2 from the first move are all cancelled by now
        expect(
            await prisma.booking.count({
                where: { groupId: group[0].groupId, status: "CANCELLED" },
            })
        ).toBe(first.length + group.length);
    });

    it("returns an old (cancelled) link alone, never the group's new bookings", async () => {
        const group = await createGroup();
        await moveGroupBooking(group[0].groupId!, testDate, 660, {
            outsideHours: true,
        });

        const result = await getBookingGroupByToken(group[0].cancelToken);

        expect(result?.map((b) => b.id)).toEqual([group[0].id]);
        expect(result?.[0].status).toBe("CANCELLED");
    });

    it("leaves out a member cancelled on their own", async () => {
        const group = await createGroup();
        await cancelBooking(group[1].id);

        const result = await getBookingGroupByToken(group[0].cancelToken);

        expect(result?.map((b) => b.id)).toEqual([group[0].id]);
    });
});
