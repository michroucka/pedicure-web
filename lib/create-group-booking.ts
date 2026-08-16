import { BookingSource } from "@/lib/generated/prisma/enums.ts"
import { Booking, Client } from "@/lib/generated/prisma/client.ts"
import { findOrCreateClient } from "@/lib/find-or-create-client.ts"
import { createBooking } from "@/lib/create-booking.ts"
import { prisma } from "@/lib/prisma.ts"

export async function createGroupBooking(
    people: {
        name: string
        phone: string
        email?: string
        serviceId: string
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
            const client: Client = await findOrCreateClient(
                person.phone,
                person.name,
                person.email
            );
            const booking: Booking = await createBooking({
                clientId: client.id,
                serviceId: person.serviceId,
                date,
                startTime,
                source,
                groupId,
            }, tx);
            startTime = booking.endTime;
            bookings.push(booking);
        }
    })

    return bookings;
}