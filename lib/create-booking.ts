import { BookingSource } from "@/lib/generated/prisma/enums.ts"
import { Booking, Prisma } from "@/lib/generated/prisma/client.ts"
import { prisma } from "@/lib/prisma.ts"


export async function createBooking({
  clientId,
  serviceId,
  date,
  startTime,
  source,
  groupId,
}: {
  clientId: string
  serviceId: string
  date: Date
  startTime: number
  source: BookingSource
  groupId?: string
},
  db: Prisma.TransactionClient = prisma
): Promise<Booking> {
  const service = await db.service.findUniqueOrThrow({ where: { id: serviceId } });
  const endTime = startTime + service.durationMinutes;
  const cancelToken = crypto.randomUUID();

  return await db.booking.create({
    data: { clientId, serviceId, date, startTime, endTime, groupId, source, cancelToken }
  });
}