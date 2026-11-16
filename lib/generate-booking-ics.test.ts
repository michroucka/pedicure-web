import { describe, expect, it } from "vitest";
import { generateBookingIcs } from "@/lib/generate-booking-ics";

const date = new Date(Date.UTC(2026, 10, 17));

// iCalendar folds long lines at 75 octets ("\r\n" + space/tab).
const unfold = (ics: string) => ics.replace(/\r\n[ \t]/g, "");

describe("generateBookingIcs", () => {
    it("spans the whole group in one event with the address", () => {
        const ics = unfold(
            generateBookingIcs([
                {
                    date,
                    startTime: 960,
                    endTime: 1020,
                    client: { name: "Jana Nováková" },
                    guestName: null,
                    service: { name: "Pedikúra komplet" },
                },
                {
                    date,
                    startTime: 1020,
                    endTime: 1065,
                    client: { name: "Jana Nováková" },
                    guestName: "Petra Nováková",
                    service: { name: "Pedikúra s lakem" },
                },
            ])
        );

        expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1);
        // 16:00-17:45 Prague in November (CET, UTC+1).
        expect(ics).toContain("DTSTART:20261117T150000Z");
        expect(ics).toContain("DTEND:20261117T164500Z");
        expect(ics).toContain(
            "LOCATION:Boženy Němcové 204\\, 331 41 Kralovice"
        );
        expect(ics).toContain("Petra Nováková – Pedikúra s lakem");
    });

    it("never puts the manage link into the calendar", () => {
        const ics = generateBookingIcs([
            {
                date,
                startTime: 960,
                endTime: 990,
                client: { name: "Jana Nováková" },
                guestName: null,
                service: { name: "Pedikúra klasik" },
            },
        ]);

        expect(ics).not.toContain("/rezervace/sprava/");
    });

    it("uses the summer offset in summer", () => {
        const ics = generateBookingIcs([
            {
                date: new Date(Date.UTC(2026, 6, 1)),
                startTime: 540,
                endTime: 570,
                client: { name: "Jana Nováková" },
                guestName: null,
                service: { name: "Pedikúra klasik" },
            },
        ]);

        // 9:00 Prague in July (CEST, UTC+2).
        expect(ics).toContain("DTSTART:20260701T070000Z");
    });
});
