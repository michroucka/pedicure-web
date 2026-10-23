import { describe, expect, it } from "vitest";
import { getExpiredClientIds, type RetentionClient } from "./data-retention";

// today = 2026-06-15 → cutoff (3 years back) = 2023-06-15. Dates use the same
// UTC-midnight convention as Booking.date / getCzechToday().
const today = new Date(Date.UTC(2026, 5, 15));
const day = (y: number, m: number, d: number) =>
    new Date(Date.UTC(y, m - 1, d));

function client(
    id: string,
    createdAt: Date,
    bookings: RetentionClient["bookings"] = []
): RetentionClient {
    return { id, createdAt, bookings };
}

function visit(date: Date, status: "CONFIRMED" | "CANCELLED" = "CONFIRMED") {
    return { date, status, createdAt: date };
}

describe("getExpiredClientIds", () => {
    it("expires a client whose last visit is more than 3 years ago", () => {
        const clients = [
            client("old", day(2020, 1, 1), [
                visit(day(2021, 3, 1)),
                visit(day(2023, 6, 14)),
            ]),
        ];
        expect(getExpiredClientIds(clients, today)).toEqual(["old"]);
    });

    it("keeps a client whose last visit is exactly 3 years ago", () => {
        const clients = [
            client("edge", day(2020, 1, 1), [visit(day(2023, 6, 15))]),
        ];
        expect(getExpiredClientIds(clients, today)).toEqual([]);
    });

    it("keeps a client with a recent visit despite old ones", () => {
        const clients = [
            client("regular", day(2019, 1, 1), [
                visit(day(2020, 1, 1)),
                visit(day(2025, 12, 1)),
            ]),
        ];
        expect(getExpiredClientIds(clients, today)).toEqual([]);
    });

    it("keeps a client with an upcoming booking, however old the last visit", () => {
        const clients = [
            client("returning", day(2019, 1, 1), [
                visit(day(2020, 1, 1)),
                {
                    date: day(2026, 7, 1),
                    status: "CONFIRMED",
                    createdAt: day(2026, 6, 1),
                },
            ]),
        ];
        expect(getExpiredClientIds(clients, today)).toEqual([]);
    });

    it("treats a booking today as upcoming", () => {
        const clients = [
            client("today", day(2019, 1, 1), [
                visit(day(2020, 1, 1)),
                {
                    date: today,
                    status: "CONFIRMED",
                    createdAt: day(2026, 6, 1),
                },
            ]),
        ];
        expect(getExpiredClientIds(clients, today)).toEqual([]);
    });

    it("ignores cancelled bookings when finding the last visit", () => {
        const clients = [
            client("cancelled-later", day(2019, 1, 1), [
                visit(day(2020, 1, 1)),
                visit(day(2025, 1, 1), "CANCELLED"),
            ]),
        ];
        expect(getExpiredClientIds(clients, today)).toEqual([
            "cancelled-later",
        ]);
    });

    it("does not keep a client for a cancelled upcoming booking", () => {
        const clients = [
            client("cancelled-future", day(2019, 1, 1), [
                visit(day(2020, 1, 1)),
                visit(day(2026, 7, 1), "CANCELLED"),
            ]),
        ];
        expect(getExpiredClientIds(clients, today)).toEqual([
            "cancelled-future",
        ]);
    });

    it("counts a client without bookings from createdAt", () => {
        const clients = [
            client("stale", day(2023, 6, 14)),
            client("fresh", day(2023, 6, 15)),
        ];
        expect(getExpiredClientIds(clients, today)).toEqual(["stale"]);
    });

    it("counts a client with only cancelled bookings from the latest one made", () => {
        const clients = [
            client("recent-cancel", day(2019, 1, 1), [
                {
                    date: day(2025, 2, 1),
                    status: "CANCELLED",
                    createdAt: day(2025, 1, 20),
                },
            ]),
            client("old-cancel", day(2019, 1, 1), [
                {
                    date: day(2022, 2, 1),
                    status: "CANCELLED",
                    createdAt: day(2022, 1, 20),
                },
            ]),
        ];
        expect(getExpiredClientIds(clients, today)).toEqual(["old-cancel"]);
    });
});
