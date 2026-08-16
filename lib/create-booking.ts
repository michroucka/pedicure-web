import { BookingSource } from "@/lib/generated/prisma/enums.ts"
import type { Booking } from "@/lib/generated/prisma/client.ts"
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
}): Promise<Booking> {
  const service = await prisma.service.findUniqueOrThrow({ where: { id: serviceId } });
  const endTime = startTime + service.durationMinutes;
  const cancelToken = crypto.randomUUID();

  return await prisma.booking.create({
    data: { clientId, serviceId, date, startTime, endTime, groupId, source, cancelToken }
  });
}