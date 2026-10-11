import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendBookingConfirmationEmail } from "./send-booking-confirmation-email.ts";
import { BookingConfirmationEmail } from "@/emails/booking-confirmation.tsx";

const send = vi.fn();
vi.mock("resend", () => ({
    Resend: vi.fn(function () {
        return { emails: { send } };
    }),
}));
vi.mock("@/emails/booking-confirmation.tsx", () => ({
    BookingConfirmationEmail: vi.fn(() => null),
}));

type EmailBooking = Parameters<typeof sendBookingConfirmationEmail>[0][number];

function booking(overrides: {
    guestName: string | null;
    startTime: number;
    serviceName: string;
}): EmailBooking {
    return {
        date: new Date(Date.UTC(2099, 0, 5)),
        startTime: overrides.startTime,
        endTime: overrides.startTime + 30,
        guestName: overrides.guestName,
        cancelToken: `token-${overrides.startTime}`,
        client: { name: "Jana Beránková", email: "jana@example.com" },
        service: { name: overrides.serviceName },
    } as EmailBooking;
}

describe("sendBookingConfirmationEmail", () => {
    beforeEach(() => {
        vi.stubEnv("RESEND_API_KEY", "test-key");
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        vi.clearAllMocks();
    });

    it("lists every group member under their own name, greeting the main contact", async () => {
        await sendBookingConfirmationEmail([
            booking({ guestName: null, startTime: 540, serviceName: "Klasik" }),
            booking({ guestName: "Eva Beránková", startTime: 570, serviceName: "Komplet" }),
        ]);

        expect(send).toHaveBeenCalledOnce();
        expect(send.mock.calls[0][0].to).toBe("jana@example.com");
        expect(BookingConfirmationEmail).toHaveBeenCalledWith(
            expect.objectContaining({
                clientName: "Jana Beránková",
                people: [
                    { name: "Jana Beránková", serviceName: "Klasik" },
                    { name: "Eva Beránková", serviceName: "Komplet" },
                ],
            })
        );
    });

    it("sends the 'moved' variant with its own subject and the new link", async () => {
        await sendBookingConfirmationEmail(
            [booking({ guestName: null, startTime: 600, serviceName: "Klasik" })],
            "moved"
        );

        expect(send.mock.calls[0][0].subject).toBe("Rezervace přesunuta");
        expect(BookingConfirmationEmail).toHaveBeenCalledWith(
            expect.objectContaining({
                variant: "moved",
                manageUrl: "https://www.pedikurakralovice.cz/rezervace/sprava/token-600",
            })
        );
    });
});
