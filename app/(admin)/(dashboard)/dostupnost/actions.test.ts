import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { createBooking } from "@/lib/create-booking";
import { createGroupBooking } from "@/lib/create-group-booking";
import {
    checkDayOverrideConflicts,
    checkRangeConflicts,
    saveCloseRange,
    saveDayOverride,
    saveRecurringAvailability,
} from "./actions";
import type { AvailabilityFormData } from "./schema";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/require-admin", () => ({
    requireAdmin: vi.fn(async () => "admin"),
}));

// Dates no other test file uses. The weekday comes from the date, so the
// recurring schedule below is set up for exactly that weekday.
const DATE_STR = "2099-12-21";
const DATE = new Date(`${DATE_STR}T00:00:00.000Z`);
const NEXT_DATE = new Date("2099-12-22T00:00:00.000Z");
const WEEKDAY = DATE.getUTCDay();

type RecurringRow = { dayOfWeek: number; startTime: number; endTime: number };

function weekWith(
    dayOfWeek: number,
    blocks: { startTime: string; endTime: string }[]
): AvailabilityFormData {
    return {
        days: Array.from({ length: 7 }, (_, d) => ({
            dayOfWeek: d,
            blocks: d === dayOfWeek ? blocks : [],
        })),
    };
}

async function exceptionsOn(date: Date) {
    return prisma.availabilityException.findMany({
        where: { date },
        select: { type: true, startTime: true, endTime: true },
        orderBy: { startTime: "asc" },
    });
}

async function weeklySchedule(): Promise<RecurringRow[]> {
    return prisma.recurringAvailability.findMany({
        select: { dayOfWeek: true, startTime: true, endTime: true },
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });
}

describe("dostupnost actions", () => {
    // The weekly schedule is one global table shared with other test files
    // (and with CI runs of other branches on the same test DB). Only the
    // test weekday is swapped out here, and put back afterwards.
    let savedSchedule: RecurringRow[];
    let clientId: string;
    let serviceId: number;

    beforeEach(async () => {
        savedSchedule = await weeklySchedule();
        await prisma.recurringAvailability.deleteMany({
            where: { dayOfWeek: WEEKDAY },
        });
        // 9:00–17:00 on the test weekday
        await prisma.recurringAvailability.create({
            data: { dayOfWeek: WEEKDAY, startTime: 540, endTime: 1020 },
        });

        const client = await prisma.client.create({
            data: { name: "Test Dostupnost", phone: "777 555 666" },
        });
        clientId = client.id;
        const service = await prisma.service.create({
            data: { name: "Test Dostupnost 60", durationMinutes: 60, price: 1 },
        });
        serviceId = service.id;
    });

    afterEach(async () => {
        await prisma.availabilityException.deleteMany({
            where: {
                date: { gte: DATE, lte: new Date("2100-12-31T00:00:00Z") },
            },
        });
        await prisma.booking.deleteMany({ where: { clientId } });
        await prisma.client.delete({ where: { id: clientId } });
        await prisma.service.delete({ where: { id: serviceId } });
        await prisma.recurringAvailability.deleteMany({
            where: { dayOfWeek: WEEKDAY },
        });
        await prisma.recurringAvailability.createMany({
            data: savedSchedule.filter((r) => r.dayOfWeek === WEEKDAY),
        });
    });

    function book(startTime: number, date = DATE) {
        return createBooking({
            clientId,
            serviceId,
            date,
            startTime,
            source: "PHONE",
        });
    }

    describe("saveRecurringAvailability", () => {
        // This one replaces the whole week by design, so it can't be
        // limited to one day – restore everything (the outer afterEach
        // then puts the test weekday back on top of it).
        afterEach(async () => {
            await prisma.recurringAvailability.deleteMany({});
            await prisma.recurringAvailability.createMany({
                data: savedSchedule,
            });
        });

        it("replaces the whole weekly schedule and merges touching blocks", async () => {
            await saveRecurringAvailability(
                weekWith(1, [
                    { startTime: "09:00", endTime: "12:00" },
                    { startTime: "12:00", endTime: "14:00" },
                    { startTime: "15:00", endTime: "18:00" },
                ])
            );

            const rows = await prisma.recurringAvailability.findMany({
                select: { dayOfWeek: true, startTime: true, endTime: true },
                orderBy: { startTime: "asc" },
            });
            expect(rows).toEqual([
                { dayOfWeek: 1, startTime: 540, endTime: 840 },
                { dayOfWeek: 1, startTime: 900, endTime: 1080 },
            ]);
        });

        it("ignores overlapping blocks and keeps the old schedule", async () => {
            const before = await weeklySchedule();

            await saveRecurringAvailability(
                weekWith(1, [
                    { startTime: "09:00", endTime: "12:00" },
                    { startTime: "11:00", endTime: "14:00" },
                ])
            );

            expect(await weeklySchedule()).toEqual(before);
        });

        it("ignores a week that doesn't have all 7 days", async () => {
            const before = await weeklySchedule();

            await saveRecurringAvailability({ days: [] });

            expect(await weeklySchedule()).toEqual(before);
        });
    });

    describe("saveDayOverride", () => {
        it("blocks the part of the regular hours the day no longer has", async () => {
            const result = await saveDayOverride({
                date: DATE_STR,
                blocks: [{ startTime: "09:00", endTime: "12:00" }],
            });

            expect(result).toEqual({ ok: true });
            expect(await exceptionsOn(DATE)).toEqual([
                { type: "BLOCKED", startTime: 720, endTime: 1020 },
            ]);
        });

        it("opens extra time outside the regular hours", async () => {
            await saveDayOverride({
                date: DATE_STR,
                blocks: [{ startTime: "08:00", endTime: "17:00" }],
            });

            expect(await exceptionsOn(DATE)).toEqual([
                { type: "EXTRA_OPEN", startTime: 480, endTime: 540 },
            ]);
        });

        it("closes the whole day with one all-day block", async () => {
            await saveDayOverride({ date: DATE_STR, blocks: [] });

            expect(await exceptionsOn(DATE)).toEqual([
                { type: "BLOCKED", startTime: null, endTime: null },
            ]);
        });

        it("replaces the day's previous override instead of stacking on it", async () => {
            await saveDayOverride({ date: DATE_STR, blocks: [] });
            await saveDayOverride({
                date: DATE_STR,
                blocks: [{ startTime: "09:00", endTime: "17:00" }],
            });

            expect(await exceptionsOn(DATE)).toEqual([]);
        });

        it("stores nothing when closing a day that is closed anyway", async () => {
            await prisma.recurringAvailability.deleteMany({
                where: { dayOfWeek: WEEKDAY },
            });

            await saveDayOverride({ date: DATE_STR, blocks: [] });

            expect(await exceptionsOn(DATE)).toEqual([]);
        });

        it("returns the validation message for overlapping blocks", async () => {
            const result = await saveDayOverride({
                date: DATE_STR,
                blocks: [
                    { startTime: "09:00", endTime: "12:00" },
                    { startTime: "10:00", endTime: "13:00" },
                ],
            });

            expect(result).toEqual({
                ok: false,
                error: "Bloky se překrývají.",
            });
            expect(await exceptionsOn(DATE)).toEqual([]);
        });
    });

    describe("checkDayOverrideConflicts", () => {
        it("lists confirmed bookings that overlap a blocked range", async () => {
            await book(600);
            await book(840);

            const conflicts = await checkDayOverrideConflicts(DATE_STR, [
                { start: 630, end: 700 },
            ]);

            expect(conflicts).toEqual([
                { clientName: "Test Dostupnost", startTime: 600, endTime: 660 },
            ]);
        });

        it("ignores bookings that only touch the range and cancelled ones", async () => {
            await book(600);
            const cancelled = await book(720);
            await prisma.booking.update({
                where: { id: cancelled.id },
                data: { status: "CANCELLED" },
            });

            const conflicts = await checkDayOverrideConflicts(DATE_STR, [
                { start: 660, end: 800 },
            ]);

            expect(conflicts).toEqual([]);
        });

        it("names group guests by their own name", async () => {
            await createGroupBooking(
                [
                    { clientId, serviceId, extraTimeMinutes: 0 },
                    {
                        clientId,
                        guestName: "Host Dostupnost",
                        serviceId,
                        extraTimeMinutes: 0,
                    },
                ],
                DATE,
                600,
                "PHONE"
            );

            const conflicts = await checkDayOverrideConflicts(DATE_STR, [
                { start: 540, end: 1020 },
            ]);

            expect(conflicts.map((c) => c.clientName)).toEqual([
                "Test Dostupnost",
                "Host Dostupnost",
            ]);
        });

        it("returns nothing for invalid input", async () => {
            await book(600);

            expect(
                await checkDayOverrideConflicts("not-a-date", [
                    { start: 540, end: 1020 },
                ])
            ).toEqual([]);
            expect(
                await checkDayOverrideConflicts(DATE_STR, [
                    { start: -10, end: 9999 },
                ])
            ).toEqual([]);
        });
    });

    describe("saveCloseRange / checkRangeConflicts", () => {
        it("closes every day of the range with an all-day block", async () => {
            await saveDayOverride({
                date: DATE_STR,
                blocks: [{ startTime: "09:00", endTime: "12:00" }],
            });

            const result = await saveCloseRange({
                startDate: DATE_STR,
                endDate: "2099-12-22",
            });

            expect(result).toEqual({ ok: true });
            const allDay = { type: "BLOCKED", startTime: null, endTime: null };
            expect(await exceptionsOn(DATE)).toEqual([allDay]);
            expect(await exceptionsOn(NEXT_DATE)).toEqual([allDay]);
        });

        it("lists every confirmed booking in the range", async () => {
            await book(600);
            await book(900, NEXT_DATE);
            await book(600, new Date("2099-12-23T00:00:00.000Z"));

            const conflicts = await checkRangeConflicts(DATE_STR, "2099-12-22");

            expect(conflicts.map((c) => c.startTime)).toEqual([600, 900]);
        });

        it("rejects a range longer than a year", async () => {
            const result = await saveCloseRange({
                startDate: DATE_STR,
                endDate: "2100-12-31",
            });

            expect(result).toEqual({
                ok: false,
                error: "Rozsah může mít nejvýš rok.",
            });
            expect(await exceptionsOn(DATE)).toEqual([]);
            expect(await checkRangeConflicts(DATE_STR, "2100-12-31")).toEqual(
                []
            );
        });

        it("rejects a range that ends before it starts", async () => {
            const result = await saveCloseRange({
                startDate: "2099-12-22",
                endDate: DATE_STR,
            });

            expect(result).toEqual({
                ok: false,
                error: "Konec rozsahu musí být po jeho začátku.",
            });
        });
    });
});
