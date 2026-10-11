import { describe, expect, it } from "vitest";
import { getBookingPersonName } from "@/lib/get-booking-person-name.ts";

describe("getBookingPersonName", () => {
    it("returns the guest name for a non-main group member", () => {
        const result = getBookingPersonName({
            client: { name: "Jana Beránková" },
            guestName: "Eva Beránková",
        });

        expect(result).toBe("Eva Beránková");
    });

    it("falls back to the client name when there is no guest", () => {
        const result = getBookingPersonName({
            client: { name: "Jana Beránková" },
            guestName: null,
        });

        expect(result).toBe("Jana Beránková");
    });
});
