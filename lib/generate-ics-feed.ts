import { createEvents, type DateArray, type EventAttributes } from "ics";

type BookingWithRelations = {
    date: Date;
    startTime: number;
    endTime: number;
    client: { name: string };
    service: { name: string };
};

export function generateIcsFeed(bookings: BookingWithRelations[]): string {
    const events: EventAttributes[] = bookings.map((booking) => {
        const start: DateArray = [
            booking.date.getUTCFullYear(),
            booking.date.getUTCMonth() + 1,
            booking.date.getUTCDate(),
            Math.floor(booking.startTime / 60),
            booking.startTime % 60
        ];
        const end: DateArray = [
            booking.date.getUTCFullYear(),
            booking.date.getUTCMonth() + 1,
            booking.date.getUTCDate(),
            Math.floor(booking.endTime / 60),
            booking.endTime % 60,
        ];

        return {
            title: `${booking.client.name} – ${booking.service.name}`,
            start: start,
            end: end,
            startInputType: "local",
            startOutputType: "local",
            endInputType: "local",
            endOutputType: "local",
        };
    });

    const { error, value } = createEvents(events, {
        calName: "Nohy v cajku",
    });

    if (error) throw error;
    return value!;
}