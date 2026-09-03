import { describe, expect, it } from "vitest";
import { generateIcsFeed } from "@/lib/generate-ics-feed.ts";

describe("generateIcsFeed", () => {
    it("generates an event with the correct date and time", () => {
        const result = generateIcsFeed([
            {
                date: new Date(Date.UTC(2026,5,13)),
                startTime: 540,
                endTime: 570,
                client: { name: "Jana Nováková" },
                service: { name: "Pedikúra klasik" },
            }
        ]);
        
        expect(result).toContain("DTSTART:20260613T090000");
        expect(result).toContain("SUMMARY:Jana Nováková – Pedikúra klasik");
    });

    it("generates multiple VEVENT blocks for multiple bookings", () => {
        const bookings = [
            {
                date: new Date(Date.UTC(2026, 5, 13)),
                startTime: 540,
                endTime: 570,
                client: { name: "Jana Nováková" },
                service: { name: "Pedikúra klasik" },
            },
            {
                date: new Date(Date.UTC(2026, 5, 13)),
                startTime: 570,
                endTime: 630,
                client: { name: "Petra Dvořáková" },
                service: { name: "Pedikúra komplet" },
            },
        ];

        const result = generateIcsFeed(bookings);
        const eventCount = (result.match(/BEGIN:VEVENT/g) ?? []).length;

        expect(eventCount).toBe(2);
    });

    it("doesn't crash on empty bookings array", () => {
        const result = generateIcsFeed([]);

        expect(result).toContain("BEGIN:VCALENDAR");
        expect(result).not.toContain("BEGIN:VEVENT");
    })
})