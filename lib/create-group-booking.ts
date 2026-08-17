import { BookingSource } from "@/lib/generated/prisma/enums.ts";
import { Booking } from "@/lib/generated/prisma/client.ts";
import { createBooking } from "@/lib/create-booking.ts";
import { prisma } from "@/lib/prisma.ts";

export async function createGroupBooking(
    people: {
        clientId: string;
        extraTimeMinutes: number;
        serviceId: number;
    }[],
    date: Date,
    groupStart: number,
    source: BookingSource
): Promise<Booking[]> {
    const bookings: Booking[] = [];
    const groupId: string = crypto.randomUUID();
    let startTime: number = groupStart;

    await prisma.$transaction(async (tx) => {
        for (const person of people) {
            const booking: Booking = await createBooking(
                {
                    clientId: person.clientId,
                    serviceId: person.serviceId,
                    date,
                    startTime,
                    source,
                    groupId,
                    extraTimeMinutes: person.extraTimeMinutes,
                },
                tx
            );
            startTime = booking.endTime;
            bookings.push(booking);
        }
    });

    return bookings;
}
