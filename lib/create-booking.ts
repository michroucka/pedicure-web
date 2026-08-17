import { BookingSource } from "@/lib/generated/prisma/enums.ts";
import { Booking, Prisma } from "@/lib/generated/prisma/client.ts";
import { prisma } from "@/lib/prisma.ts";

export async function createBooking(
    {
        clientId,
        serviceId,
        date,
        startTime,
        source,
        groupId,
        reminderRequested = false,
        extraTimeMinutes = 0
    }: {
        clientId: string;
        serviceId: number;
        date: Date;
        startTime: number;
        source: BookingSource;
        groupId?: string;
        reminderRequested?: boolean;
        extraTimeMinutes?: number;
    },
    db: Prisma.TransactionClient = prisma
): Promise<Booking> {
    const service = await db.service.findUniqueOrThrow({
        where: { id: serviceId },
    });
    const endTime = startTime + service.durationMinutes + extraTimeMinutes;
    const cancelToken = crypto.randomUUID();

    return await db.booking.create({
        data: {
            clientId,
            serviceId,
            date,
            startTime,
            endTime,
            groupId,
            source,
            cancelToken,
            reminderRequested,
        },
    });
}
