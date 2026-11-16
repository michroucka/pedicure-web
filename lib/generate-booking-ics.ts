import { createEvent, type DateArray } from "ics";
import { BUSINESS_INFO } from "@/lib/business-info";
import { getBookingPersonName } from "@/lib/get-booking-person-name";

type GroupBooking = {
    date: Date;
    startTime: number;
    endTime: number;
    client: { name: string };
    guestName: string | null;
    service: { name: string };
};

// Offset of Europe/Prague from UTC at the given instant, in ms (+1 h in
// winter, +2 h in summer).
function pragueOffsetMs(instant: number): number {
    const parts = Object.fromEntries(
        new Intl.DateTimeFormat("en-US", {
            timeZone: "Europe/Prague",
            hourCycle: "h23",
            year: "numeric",
            month: "numeric",
            day: "numeric",
            hour: "numeric",
            minute: "numeric",
        })
            .formatToParts(instant)
            .map((part) => [part.type, Number(part.value)])
    );
    const pragueAsUtc = Date.UTC(
        parts.year,
        parts.month - 1,
        parts.day,
        parts.hour,
        parts.minute
    );
    return pragueAsUtc - Math.floor(instant / 60_000) * 60_000;
}

// Booking times are Prague wall-clock minutes on a UTC-midnight date. The
// event is written in UTC: a time without a zone ("floating") is read as
// UTC by some calendars (Google), which showed the visit an hour late.
function pragueTimeToUtcDateArray(date: Date, minutes: number): DateArray {
    const wallClockAsUtc = date.getTime() + minutes * 60_000;
    // Second pass: near a DST switch the offset at the first guess can
    // differ from the one at the real instant.
    let instant = wallClockAsUtc - pragueOffsetMs(wallClockAsUtc);
    instant = wallClockAsUtc - pragueOffsetMs(instant);
    const utc = new Date(instant);
    return [
        utc.getUTCFullYear(),
        utc.getUTCMonth() + 1,
        utc.getUTCDate(),
        utc.getUTCHours(),
        utc.getUTCMinutes(),
    ];
}

// One event for the client's own calendar, covering the whole group. No
// magic link in it - calendars get synced and shared, the link would let
// anyone with access cancel the visit.
export function generateBookingIcs(bookings: GroupBooking[]): string {
    const first = bookings[0];
    const last = bookings.at(-1)!;
    const { address } = BUSINESS_INFO;

    const people = bookings
        .map((b) => `${getBookingPersonName(b)} – ${b.service.name}`)
        .join("\n");

    const { error, value } = createEvent({
        title: `Pedikúra – ${BUSINESS_INFO.name}`,
        start: pragueTimeToUtcDateArray(first.date, first.startTime),
        end: pragueTimeToUtcDateArray(first.date, last.endTime),
        startInputType: "utc",
        startOutputType: "utc",
        endInputType: "utc",
        endOutputType: "utc",
        location: `${address.street}, ${address.postalCode} ${address.city}`,
        description: `${people}\n\nZměna termínu: ${BUSINESS_INFO.phoneDisplay}`,
    });

    if (error) throw error;
    return value!;
}
