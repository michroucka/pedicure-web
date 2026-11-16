import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createBooking } from "@/lib/create-booking";
import { createGroupBooking } from "@/lib/create-group-booking";
import { sendSms, getSmsCreditCzk } from "@/lib/sms";
import { sendLowCreditAlertEmail } from "@/lib/send-low-credit-alert-email";
import { sendPushNotification } from "@/lib/send-push";
import { GET } from "./route";

// "Today" is pinned to a far-future date that no other test file uses, so
// the cron only ever sees this file's bookings (it reads every confirmed
// booking of the day, not just ours).
const TEST_TODAY = new Date("2099-11-20T00:00:00.000Z");
vi.mock("@/lib/utils", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@/lib/utils")>()),
    getCzechToday: () => TEST_TODAY,
}));
vi.mock("@/lib/sms", () => ({
    sendSms: vi.fn(),
    getSmsCreditCzk: vi.fn(),
}));
vi.mock("@/lib/send-low-credit-alert-email", () => ({
    sendLowCreditAlertEmail: vi.fn(),
}));
vi.mock("@/lib/send-push", () => ({ sendPushNotification: vi.fn() }));

const CRON_SECRET = "test-cron-secret";

function cronRequest(authorization = `Bearer ${CRON_SECRET}`) {
    return new NextRequest("https://example.test/api/cron/morning-reminders", {
        headers: { authorization },
    });
}

describe("GET /api/cron/morning-reminders", () => {
    let clientIds: string[];
    let serviceId: number;

    beforeEach(async () => {
        vi.stubEnv("CRON_SECRET", CRON_SECRET);
        vi.mocked(sendSms).mockResolvedValue(true);
        vi.mocked(getSmsCreditCzk).mockResolvedValue(500);

        const clients = await Promise.all([
            prisma.client.create({
                data: { name: "Test Cron A", phone: "777 111 222" },
            }),
            prisma.client.create({
                data: { name: "Test Cron B", phone: "777 333 444" },
            }),
            prisma.client.create({
                data: { name: "Test Cron Bez Telefonu", phone: null },
            }),
        ]);
        clientIds = clients.map((c) => c.id);

        const service = await prisma.service.create({
            data: { name: "Test Cron Service", durationMinutes: 60, price: 1 },
        });
        serviceId = service.id;
    });

    afterEach(async () => {
        vi.unstubAllEnvs();
        vi.clearAllMocks();
        await prisma.booking.deleteMany({
            where: { clientId: { in: clientIds } },
        });
        await prisma.client.deleteMany({ where: { id: { in: clientIds } } });
        await prisma.service.delete({ where: { id: serviceId } });
    });

    function book(clientIndex: number, startTime: number, date = TEST_TODAY) {
        return createBooking({
            clientId: clientIds[clientIndex],
            serviceId,
            date,
            startTime,
            source: "PHONE",
        });
    }

    it("rejects a request without the cron secret and sends nothing", async () => {
        await book(0, 600);

        const response = await GET(cronRequest("Bearer wrong"));

        expect(response.status).toBe(401);
        expect(sendSms).not.toHaveBeenCalled();
        expect(sendPushNotification).not.toHaveBeenCalled();
    });

    it("texts each of today's clients once and marks the bookings as reminded", async () => {
        const first = await book(0, 600);
        const second = await book(1, 720);

        const response = await GET(cronRequest());

        expect(await response.json()).toEqual({ groups: 2, sent: 2 });
        expect(sendSms).toHaveBeenCalledTimes(2);
        expect(sendSms).toHaveBeenCalledWith(
            "777 111 222",
            expect.stringContaining("od 10:00")
        );
        expect(sendSms).toHaveBeenCalledWith(
            "777 333 444",
            expect.stringContaining("od 12:00")
        );

        const after = await prisma.booking.findMany({
            where: { id: { in: [first.id, second.id] } },
        });
        expect(after.every((b) => b.reminderSent)).toBe(true);
    });

    it("keeps the SMS free of diacritics so it stays one GSM-7 segment", async () => {
        await book(0, 600);

        await GET(cronRequest());

        const body = vi.mocked(sendSms).mock.calls[0][1];
        expect(body).toMatch(/^[\x20-\x7E]+$/);
        expect(body.length).toBeLessThanOrEqual(160);
    });

    it("does not text the same booking again on a second run", async () => {
        await book(0, 600);

        await GET(cronRequest());
        vi.mocked(sendSms).mockClear();
        const response = await GET(cronRequest());

        expect(sendSms).not.toHaveBeenCalled();
        expect(await response.json()).toEqual({ groups: 0, sent: 0 });
    });

    it("leaves reminderSent false when the SMS fails, so a rerun retries it", async () => {
        const booking = await book(0, 600);
        vi.mocked(sendSms).mockResolvedValue(false);

        const response = await GET(cronRequest());

        expect(await response.json()).toEqual({ groups: 1, sent: 0 });
        const after = await prisma.booking.findUniqueOrThrow({
            where: { id: booking.id },
        });
        expect(after.reminderSent).toBe(false);
    });

    it("sends one SMS per group booking, not one per person", async () => {
        await createGroupBooking(
            [
                { clientId: clientIds[0], serviceId, extraTimeMinutes: 0 },
                {
                    clientId: clientIds[0],
                    guestName: "Host",
                    serviceId,
                    extraTimeMinutes: 0,
                },
            ],
            TEST_TODAY,
            600,
            "PHONE"
        );

        const response = await GET(cronRequest());

        expect(await response.json()).toEqual({ groups: 1, sent: 1 });
        expect(sendSms).toHaveBeenCalledTimes(1);
        expect(
            await prisma.booking.count({
                where: { clientId: clientIds[0], reminderSent: true },
            })
        ).toBe(2);
    });

    it("skips a client without a phone, cancelled bookings and other days", async () => {
        await book(2, 600);
        const cancelled = await book(0, 720);
        await prisma.booking.update({
            where: { id: cancelled.id },
            data: { status: "CANCELLED" },
        });
        await book(1, 600, new Date("2099-11-21T00:00:00.000Z"));

        await GET(cronRequest());

        expect(sendSms).not.toHaveBeenCalled();
    });

    it("pushes a day summary counting people, from first start to last end", async () => {
        await book(0, 600);
        await book(1, 720);

        await GET(cronRequest());

        expect(sendPushNotification).toHaveBeenCalledWith(
            expect.objectContaining({
                body: "Dnes máš 2 klienty od 10:00 do 13:00",
                url: "/kalendar",
            })
        );
    });

    it("pushes a day-off summary when there are no bookings", async () => {
        await GET(cronRequest());

        expect(sendPushNotification).toHaveBeenCalledTimes(1);
        expect(sendPushNotification).toHaveBeenCalledWith(
            expect.objectContaining({ body: "Dnes máš volno! 🎉" })
        );
    });

    it("alerts by email and push when the SMS credit is low", async () => {
        vi.mocked(getSmsCreditCzk).mockResolvedValue(42.5);

        await GET(cronRequest());

        expect(sendLowCreditAlertEmail).toHaveBeenCalledWith(42.5);
        expect(sendPushNotification).toHaveBeenCalledWith(
            expect.objectContaining({
                body: expect.stringContaining("42.50 Kč"),
            })
        );
    });

    it("does not alert when the credit is fine or couldn't be fetched", async () => {
        vi.mocked(getSmsCreditCzk).mockResolvedValueOnce(100);
        await GET(cronRequest());
        vi.mocked(getSmsCreditCzk).mockResolvedValueOnce(null);
        await GET(cronRequest());

        expect(sendLowCreditAlertEmail).not.toHaveBeenCalled();
    });
});
