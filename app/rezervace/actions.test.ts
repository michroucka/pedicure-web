import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma.ts";
import { getAvailableSlots } from "@/lib/get-available-slots.ts";
import { getAvailableDaysInRange } from "@/lib/get-available-days-in-range.ts";
import { verifyTurnstileToken } from "@/lib/turnstile.ts";
import { MAX_UPCOMING_ONLINE_BOOKINGS } from "@/lib/online-booking-limit.ts";
import {
    getAvailableDaysAction,
    getAvailableSlotsAction,
    getExtraMinutesAction,
    submitBooking,
    submitGroupBooking,
} from "./actions.ts";

// redirect() normally throws Next.js's own NEXT_REDIRECT error to stop the
// action — mimic that with a recognisable error so tests can assert where
// the action wanted to go.
class RedirectError extends Error {
    constructor(public url: string) {
        super(`redirect: ${url}`);
    }
}
vi.mock("next/navigation", () => ({
    redirect: vi.fn((url: string) => {
        throw new RedirectError(url);
    }),
}));
// after() needs a Next.js request context; email + push would hit real
// external services (Resend, Web Push).
vi.mock("next/server", () => ({ after: vi.fn() }));
vi.mock("@/lib/send-booking-confirmation-email.ts", () => ({
    sendBookingConfirmationEmail: vi.fn(),
}));
vi.mock("@/lib/send-push.ts", () => ({ sendPushNotification: vi.fn() }));
// Cloudflare is never called from tests; its own check has unit tests in
// lib/turnstile.test.ts.
vi.mock("@/lib/turnstile.ts", () => ({
    verifyTurnstileToken: vi.fn().mockResolvedValue(true),
}));
// Real availability on the test branch is inherited from production and
// can change — these tests are about who gets which name/extra time, not
// about slot computation (covered in get-available-slots.test.ts).
vi.mock("@/lib/get-available-slots.ts", () => ({
    getAvailableSlots: vi.fn(),
}));
vi.mock("@/lib/get-available-days-in-range.ts", () => ({
    getAvailableDaysInRange: vi.fn().mockResolvedValue([]),
}));

const TEST_DATE = new Date("2099-10-01T00:00:00.000Z");
const START = 540;

// Formatted the way PhoneInput sends it ("XXX XXX XXX") — the booking
// schemas reject anything else (see PHONE_RE).
function uniquePhone(): string {
    const digits = `7${Math.floor(10_000_000 + Math.random() * 89_999_999)}`;
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
}

async function expectRedirect(promise: Promise<unknown>): Promise<string> {
    const error = await promise.then(
        () => {
            throw new Error("expected the action to redirect");
        },
        (e: unknown) => e
    );
    expect(error).toBeInstanceOf(RedirectError);
    return (error as RedirectError).url;
}

describe("rezervace actions", () => {
    let phone: string;
    let serviceIds: number[];

    beforeEach(async () => {
        phone = uniquePhone();
        vi.mocked(getAvailableSlots).mockReset().mockResolvedValue([START]);
        vi.mocked(getAvailableDaysInRange).mockClear();

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
        await prisma.booking.deleteMany({ where: { clientId: { in: clientIds } } });
        await prisma.client.deleteMany({ where: { id: { in: clientIds } } });
        await prisma.service.deleteMany({ where: { id: { in: serviceIds } } });
    });

    async function submitGroup(names: string[], services = names.map(() => serviceIds[0])) {
        return expectRedirect(
            submitGroupBooking(
                { date: TEST_DATE, serviceIds: services, startTime: START },
                { names, phone, email: "skupina@example.com" }
            )
        );
    }

    async function bookingsForPhone() {
        return prisma.booking.findMany({
            where: { client: { phone } },
            include: { client: true },
            orderBy: { startTime: "asc" },
        });
    }

    describe("submitGroupBooking", () => {
        it("keeps every person's own name (regression: all got the last name)", async () => {
            const url = await submitGroup(["Jana Beránková", "Eva Beránková", "Petr Beránek"]);
            expect(url).toMatch(/^\/rezervace\/sprava\/[\w-]+\?created=1$/);
            // lands on the manage page of this very group - the redirect is the
            // client's only confirmation besides the e-mail
            const token = url.split("/").at(-1)!.split("?")[0];
            const owner = await prisma.booking.findUniqueOrThrow({ where: { cancelToken: token } });

            const bookings = await bookingsForPhone();
            expect(owner.groupId).toBe(bookings[0].groupId);
            expect(bookings.map((b) => b.guestName)).toEqual([null, "Eva Beránková", "Petr Beránek"]);
            expect(bookings.map((b) => b.client.name)).toEqual([
                "Jana Beránková",
                "Jana Beránková",
                "Jana Beránková",
            ]);
        });

        it("creates exactly one client (the main contact) for a new phone", async () => {
            await submitGroup(["Jana Beránková", "Eva Beránková", "Petr Beránek", "Anna Beránková"]);

            const clients = await prisma.client.findMany({ where: { phone } });
            expect(clients).toHaveLength(1);
            expect(clients[0].name).toBe("Jana Beránková");

            const bookings = await bookingsForPhone();
            expect(bookings).toHaveLength(4);
            expect(new Set(bookings.map((b) => b.clientId)).size).toBe(1);
            expect(new Set(bookings.map((b) => b.groupId)).size).toBe(1);
        });

        it("does not rename an existing client with the guests' names", async () => {
            const existing = await prisma.client.create({
                data: { name: "Jana Beránková", phone },
            });

            // must actually complete — a validation redirect would leave the
            // client untouched too and pass the assertions below for nothing
            const url = await submitGroup(["Jana Beránková", "Eva Beránková"]);
            expect(url).toMatch(/^\/rezervace\/sprava\/[\w-]+\?created=1$/);

            const after = await prisma.client.findUniqueOrThrow({ where: { id: existing.id } });
            expect(after.name).toBe("Jana Beránková");
            expect(await prisma.client.count({ where: { phone } })).toBe(1);
        });

        it("gives the main contact's extra time only to the main contact's booking", async () => {
            await prisma.client.create({
                data: { name: "Jana Beránková", phone, extraTimeMinutes: 15 },
            });

            await submitGroup(["Jana Beránková", "Eva Beránková"], [serviceIds[0], serviceIds[1]]);

            const bookings = await bookingsForPhone();
            expect(bookings.map((b) => b.extraTimeMinutes)).toEqual([15, 0]);
            expect(bookings.map((b) => [b.startTime, b.endTime])).toEqual([
                [540, 585], // 30 + 15
                [585, 630], // 45, no extra for the guest
            ]);
            // the slot was validated for exactly the total that got stored
            expect(getAvailableSlots).toHaveBeenCalledWith(
                TEST_DATE,
                [serviceIds[0], serviceIds[1]],
                15
            );
        });

        it("trims names", async () => {
            await submitGroup(["  Jana Beránková  ", "  Eva Beránková "]);

            const bookings = await bookingsForPhone();
            expect(bookings[0].client.name).toBe("Jana Beránková");
            expect(bookings.map((b) => b.guestName)).toEqual([null, "Eva Beránková"]);
        });

        it("rejects a whitespace-only name and creates nothing", async () => {
            const url = await submitGroup(["Jana Beránková", "   "]);

            expect(url).toBe("/rezervace");
            expect(await prisma.client.count({ where: { phone } })).toBe(0);
        });

        it("redirects back to the slot picker and creates nothing when the slot is gone", async () => {
            vi.mocked(getAvailableSlots).mockResolvedValue([]);

            const url = await submitGroup(["Jana Beránková", "Eva Beránková"]);

            expect(url).toContain("error=slot_taken");
            expect(await bookingsForPhone()).toHaveLength(0);
        });
    });

    describe("submitBooking", () => {
        async function submitSolo(name: string, email: string) {
            return expectRedirect(
                submitBooking(
                    { date: TEST_DATE, serviceId: serviceIds[0], startTime: START },
                    { name, phone, email }
                )
            );
        }

        it("updates an existing client's name and e-mail to the latest provided", async () => {
            const existing = await prisma.client.create({
                data: { name: "Jana Beránková", phone, email: "stary@example.com" },
            });

            const url = await submitSolo("Jana Nováková", "novy@example.com");
            expect(url).toMatch(/^\/rezervace\/sprava\/[\w-]+\?created=1$/);

            const after = await prisma.client.findUniqueOrThrow({ where: { id: existing.id } });
            expect(after.name).toBe("Jana Nováková");
            expect(after.email).toBe("novy@example.com");
            const [booking] = await bookingsForPhone();
            expect(booking.clientId).toBe(existing.id);
            expect(booking.guestName).toBeNull();
        });

        it("rejects a failed bot check before touching anything", async () => {
            vi.mocked(verifyTurnstileToken).mockResolvedValueOnce(false);

            const url = await submitSolo("Jana Beránková", "jana@example.com");

            expect(url).toMatch(/^\/rezervace\/details\?.*error=verification/);
            expect(await prisma.client.count({ where: { phone } })).toBe(0);
        });

        it("keeps the client's known extra time in the URL when sending them back", async () => {
            await prisma.client.create({
                data: { name: "Jana Beránková", phone, extraTimeMinutes: 15 },
            });
            vi.mocked(verifyTurnstileToken).mockResolvedValueOnce(false);

            const url = await submitSolo("Jana Beránková", "jana@example.com");

            expect(url).toContain("error=verification");
            expect(url).toContain("extraMinutes=15");
        });

        it("rejects another booking once the contact holds the maximum of upcoming ones", async () => {
            for (let i = 0; i < MAX_UPCOMING_ONLINE_BOOKINGS; i++) {
                vi.mocked(getAvailableSlots).mockResolvedValueOnce([START + i * 60]);
                await expectRedirect(
                    submitBooking(
                        { date: TEST_DATE, serviceId: serviceIds[0], startTime: START + i * 60 },
                        { name: "Jana Beránková", phone, email: "jana@example.com" }
                    )
                );
            }

            // Same e-mail, different phone – still the same person's limit.
            const url = await expectRedirect(
                submitBooking(
                    { date: TEST_DATE, serviceId: serviceIds[0], startTime: 900 },
                    { name: "Jana Beránková", phone: uniquePhone(), email: "JANA@example.com" }
                )
            );

            expect(url).toContain("error=booking_limit");
            expect(await bookingsForPhone()).toHaveLength(MAX_UPCOMING_ONLINE_BOOKINGS);
        });

        it("creates or changes no client when the slot is gone", async () => {
            vi.mocked(getAvailableSlots).mockResolvedValue([]);
            const existing = await prisma.client.create({
                data: { name: "Jana Beránková", phone },
            });

            const url = await submitSolo("Jana Beránková", "jana@example.com");

            expect(url).toContain("error=slot_taken");
            const after = await prisma.client.findUniqueOrThrow({ where: { id: existing.id } });
            expect(after.email).toBeNull();
            expect(await prisma.client.count({ where: { phone } })).toBe(1);
        });
    });

    describe("getExtraMinutesAction", () => {
        it("returns the extra time when phone and name match, ignoring case, diacritics and spaces", async () => {
            await prisma.client.create({
                data: { name: "Jana Beránková", phone, extraTimeMinutes: 15 },
            });

            expect(await getExtraMinutesAction({ name: "jana  berankova", phone })).toBe(15);
            expect(await getExtraMinutesAction({ name: "Jana Beránková", phone: `+420 ${phone}` })).toBe(15);
        });

        it("reveals nothing when only the phone matches", async () => {
            await prisma.client.create({
                data: { name: "Jana Beránková", phone, extraTimeMinutes: 15 },
            });

            expect(await getExtraMinutesAction({ name: "Někdo Jiný", phone })).toBe(0);
        });

        it("reveals nothing for a name alone, without a phone", async () => {
            await prisma.client.create({
                data: { name: "Jana Beránková", phone, extraTimeMinutes: 15 },
            });

            expect(await getExtraMinutesAction({ name: "Jana Beránková", phone: "" })).toBe(0);
        });

        it("returns 0 for an unknown phone", async () => {
            expect(await getExtraMinutesAction({ name: "Nikdo", phone })).toBe(0);
        });

        it("returns 0 for empty input", async () => {
            expect(await getExtraMinutesAction({ name: "  ", phone: "  " })).toBe(0);
        });

        it("returns 0 for oversized input without looking anyone up", async () => {
            expect(await getExtraMinutesAction({ name: "x".repeat(1000), phone })).toBe(0);
        });
    });

    describe("getAvailableSlotsAction", () => {
        it("returns no slots for invalid input without computing availability", async () => {
            expect(await getAvailableSlotsAction(TEST_DATE, [])).toEqual([]);
            expect(await getAvailableSlotsAction(TEST_DATE, [1, 2, 3, 4, 5])).toEqual([]);
            expect(await getAvailableSlotsAction(new Date("nesmysl"), [serviceIds[0]])).toEqual([]);
            expect(getAvailableSlots).not.toHaveBeenCalled();
        });
    });

    describe("getAvailableDaysAction", () => {
        it("passes the client's extra time on to the day picker", async () => {
            const range = { from: TEST_DATE, to: TEST_DATE };

            await getAvailableDaysAction(range, [serviceIds[0]], 15);

            expect(getAvailableDaysInRange).toHaveBeenCalledWith(range, [serviceIds[0]], 15);
        });

        it("normalizes a tampered extra time from the URL", async () => {
            const range = { from: TEST_DATE, to: TEST_DATE };

            await getAvailableDaysAction(range, [serviceIds[0]], -30);

            expect(getAvailableDaysInRange).toHaveBeenCalledWith(range, [serviceIds[0]], 0);
        });

        it("rejects a reversed or overlong range without computing availability", async () => {
            const reversed = { from: TEST_DATE, to: new Date("2099-09-01T00:00:00.000Z") };
            const tenYears = { from: TEST_DATE, to: new Date("2109-10-01T00:00:00.000Z") };

            expect(await getAvailableDaysAction(reversed, [serviceIds[0]])).toEqual([]);
            expect(await getAvailableDaysAction(tenYears, [serviceIds[0]])).toEqual([]);
            expect(getAvailableDaysInRange).not.toHaveBeenCalled();
        });
    });
});
