import { BookingSource } from "@/lib/generated/prisma/enums.ts";
import { Booking, Prisma } from "@/lib/generated/prisma/client.ts";
import { prisma } from "@/lib/prisma.ts";

export async function createBooking(
    {
        clientId,
        guestName,
        serviceId,
        date,
        startTime,
        source,
        groupId,
        extraTimeMinutes = 0
    }: {
        clientId: string;
        guestName?: string | null;
        serviceId: number;
        date: Date;
        startTime: number;
        source: BookingSource;
        groupId?: string;
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
            guestName,
            serviceId,
            date,
            startTime,
            endTime,
            extraTimeMinutes,
            groupId,
            source,
            cancelToken,
        },
    });
}
