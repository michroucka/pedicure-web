import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma.ts";
import { createBooking } from "@/lib/create-booking.ts";
import { createGroupBooking } from "@/lib/create-group-booking.ts";
import {
    cancelBookingByTokenAction,
    getRescheduleDaysAction,
    getRescheduleSlotsAction,
    moveBookingByTokenAction,
} from "./actions.ts";

// revalidatePath needs an active Next.js request context, which a plain
// vitest run doesn't have — mock it out like any other Next.js server
// action test.
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

// "Now" = 2026-06-15T08:00Z = Monday 10:00 in Europe/Prague.
// ORIGINAL_DATE (Saturday, +5 days) and TARGET_DATE (Sunday, +6 days) both
// need their own RecurringAvailability row since moveBookingByTokenAction
// validates the target against real availability, no admin-style bypass.
const NOW = new Date("2026-06-15T08:00:00.000Z");
const TOO_SOON_DATE = new Date(Date.UTC(2026, 5, 15)); // today — under 24h away
const ORIGINAL_DATE = new Date(Date.UTC(2026, 5, 20)); // Saturday, dayOfWeek 6
const TARGET_DATE = new Date(Date.UTC(2026, 5, 21)); // Sunday, dayOfWeek 0
// Production's inherited RecurringAvailability already covers every weekday
// (Mon-Fri), so "a day with zero availability anywhere" doesn't exist on
// this branch — instead, target a time outside the 540-600 window this
// file sets up on TARGET_DATE itself.
const OUT_OF_WINDOW_START_TIME = 900;

describe("rezervace/sprava/[token] actions", () => {
    let clientIds: string[];
    let serviceId: number;

    beforeEach(async () => {
        vi.useFakeTimers();
        vi.setSystemTime(NOW);

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

        await prisma.recurringAvailability.createMany({
            data: [
                { dayOfWeek: 6, startTime: 540, endTime: 600 },
                { dayOfWeek: 0, startTime: 540, endTime: 600 },
            ],
        });
    });

    afterEach(async () => {
        vi.useRealTimers();
        await prisma.booking.deleteMany({ where: { clientId: { in: clientIds } } });
        await prisma.client.deleteMany({ where: { id: { in: clientIds } } });
        await prisma.service.delete({ where: { id: serviceId } });
        await prisma.recurringAvailability.deleteMany({
            where: { dayOfWeek: { in: [6, 0] } },
        });
    });

    describe("cancelBookingByTokenAction", () => {
        it("returns an error for an unknown token", async () => {
            const result = await cancelBookingByTokenAction("does-not-exist");
            expect(result).toEqual({ ok: false, error: expect.any(String) });
        });

        it("cancels a solo booking within the modification window", async () => {
            const booking = await createBooking({
                clientId: clientIds[0],
                serviceId,
                date: ORIGINAL_DATE,
                startTime: 540,
                source: "ONLINE",
            });

            const result = await cancelBookingByTokenAction(booking.cancelToken);

            expect(result).toEqual({ ok: true });
            const after = await prisma.booking.findUniqueOrThrow({
                where: { id: booking.id },
            });
            expect(after.status).toBe("CANCELLED");
        });

        it("refuses to cancel a booking less than 24h away", async () => {
            const booking = await createBooking({
                clientId: clientIds[0],
                serviceId,
                date: TOO_SOON_DATE,
                startTime: 600, // later today — well under 24h from 08:00 "now"
                source: "ONLINE",
            });

            const result = await cancelBookingByTokenAction(booking.cancelToken);

            expect(result.ok).toBe(false);
            const after = await prisma.booking.findUniqueOrThrow({
                where: { id: booking.id },
            });
            expect(after.status).toBe("CONFIRMED");
        });

        it("cancels the whole group via any member's token", async () => {
            const group = await createGroupBooking(
                [
                    { clientId: clientIds[0], extraTimeMinutes: 0, serviceId },
                    { clientId: clientIds[1], extraTimeMinutes: 0, serviceId },
                ],
                ORIGINAL_DATE,
                540,
                "ONLINE"
            );

            const result = await cancelBookingByTokenAction(group[1].cancelToken);

            expect(result).toEqual({ ok: true });
            const after = await prisma.booking.findMany({
                where: { id: { in: group.map((b) => b.id) } },
            });
            expect(after.every((b) => b.status === "CANCELLED")).toBe(true);
        });
    });

    describe("moveBookingByTokenAction", () => {
        it("returns an error for an unknown token", async () => {
            const result = await moveBookingByTokenAction(
                "does-not-exist",
                "2026-06-21",
                540
            );
            expect(result.ok).toBe(false);
        });

        it("refuses to move a booking less than 24h away", async () => {
            const booking = await createBooking({
                clientId: clientIds[0],
                serviceId,
                date: TOO_SOON_DATE,
                startTime: 600,
                source: "ONLINE",
            });

            const result = await moveBookingByTokenAction(
                booking.cancelToken,
                "2026-06-21",
                540
            );

            expect(result.ok).toBe(false);
        });

        it("rejects a target slot with no availability", async () => {
            const booking = await createBooking({
                clientId: clientIds[0],
                serviceId,
                date: ORIGINAL_DATE,
                startTime: 540,
                source: "ONLINE",
            });

            const result = await moveBookingByTokenAction(
                booking.cancelToken,
                "2026-06-21",
                OUT_OF_WINDOW_START_TIME
            );

            expect(result).toEqual({
                ok: false,
                error: "Zvolený termín už není volný.",
            });

            const after = await prisma.booking.findUniqueOrThrow({
                where: { id: booking.id },
            });
            expect(after.status).toBe("CONFIRMED"); // untouched on failure
        });

        it("moves a solo booking to a valid new slot and returns a fresh token", async () => {
            const booking = await createBooking({
                clientId: clientIds[0],
                serviceId,
                date: ORIGINAL_DATE,
                startTime: 540,
                source: "ONLINE",
            });

            const result = await moveBookingByTokenAction(
                booking.cancelToken,
                "2026-06-21",
                570
            );

            expect(result.ok).toBe(true);
            if (!result.ok) throw new Error("unreachable");
            expect(result.newToken).not.toBe(booking.cancelToken);

            const original = await prisma.booking.findUniqueOrThrow({
                where: { id: booking.id },
            });
            expect(original.status).toBe("CANCELLED");

            const moved = await prisma.booking.findUniqueOrThrow({
                where: { cancelToken: result.newToken },
            });
            expect(moved.status).toBe("CONFIRMED");
            expect(moved.date.getTime()).toBe(TARGET_DATE.getTime());
            expect(moved.startTime).toBe(570);
        });

        it("moves the whole group via any member's token, preserving groupId", async () => {
            const group = await createGroupBooking(
                [
                    { clientId: clientIds[0], extraTimeMinutes: 0, serviceId },
                    { clientId: clientIds[1], extraTimeMinutes: 0, serviceId },
                ],
                ORIGINAL_DATE,
                540,
                "ONLINE"
            );
            const groupId = group[0].groupId!;

            const result = await moveBookingByTokenAction(
                group[1].cancelToken,
                "2026-06-21",
                540
            );

            expect(result.ok).toBe(true);

            const oldRows = await prisma.booking.findMany({
                where: { id: { in: group.map((b) => b.id) } },
            });
            expect(oldRows.every((b) => b.status === "CANCELLED")).toBe(true);

            const newRows = await prisma.booking.findMany({
                where: { groupId, status: "CONFIRMED" },
            });
            expect(newRows).toHaveLength(2);
            expect(newRows.every((b) => b.date.getTime() === TARGET_DATE.getTime())).toBe(
                true
            );
        });
    });

    describe("getRescheduleSlotsAction / getRescheduleDaysAction", () => {
        it("returns no slots/days for an unknown token", async () => {
            expect(await getRescheduleSlotsAction("nope", "2026-06-21")).toEqual([]);
            expect(
                await getRescheduleDaysAction("nope", {
                    from: TARGET_DATE,
                    to: TARGET_DATE,
                })
            ).toEqual([]);
        });

        it("returns real slots/days for a valid token, scoped to that booking's service", async () => {
            const booking = await createBooking({
                clientId: clientIds[0],
                serviceId,
                date: ORIGINAL_DATE,
                startTime: 540,
                source: "ONLINE",
            });

            const slots = await getRescheduleSlotsAction(
                booking.cancelToken,
                "2026-06-21"
            );
            // 540-600 is a 60 min window with a 30 min service — 540 and 570
            // are always valid (0 leftover on one side); a middle candidate
            // (555) depends on the DB's global min active service duration,
            // which this test doesn't control.
            expect(slots).toEqual(expect.arrayContaining([540, 570]));

            const days = await getRescheduleDaysAction(booking.cancelToken, {
                from: TARGET_DATE,
                to: TARGET_DATE,
            });
            expect(days.map((d) => d.getTime())).toEqual([TARGET_DATE.getTime()]);
        });
    });
});
