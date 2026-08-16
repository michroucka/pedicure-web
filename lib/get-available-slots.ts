import { prisma } from "./prisma.ts"
import { toDateOnly } from "./utils.ts"
import {
  computeAvailableSlots,
  resolveDayTimeSlots,
  type Exception,
  type TimeSlot,
} from "./availability.ts"

export async function getAvailableSlots(
  date: Date,
  serviceId: string
): Promise<number[]> {
  const service = await prisma.service.findUniqueOrThrow({
    where: { id: serviceId },
  })

  const minServiceDuration = await prisma.service.aggregate({
    where: { active: true },
    _min: { durationMinutes: true },
  })

  const day = toDateOnly(date)
  const dayOfWeek = day.getUTCDay()

  const [recurring, exceptions, bookings] = await Promise.all([
    prisma.recurringAvailability.findMany({
      where: { dayOfWeek },
    }),
    prisma.availabilityException.findMany({
      where: { date: day },
    }),
    prisma.booking.findMany({
      where: { date: day, status: "CONFIRMED" },
    }),
  ])

  const recurringWindows: TimeSlot[] = recurring.map((r) => ({
    start: r.startTime,
    end: r.endTime,
  }))

  const exceptionRanges: Exception[] = exceptions.map((e) => ({
    type: e.type,
    start: e.startTime,
    end: e.endTime,
  }))

  const bookedSlots: TimeSlot[] = bookings.map((b) => ({
    start: b.startTime,
    end: b.endTime,
  }))

  const dayWindows = resolveDayTimeSlots(recurringWindows, exceptionRanges)

  return computeAvailableSlots(
    dayWindows,
    bookedSlots,
    service.durationMinutes,
    minServiceDuration._min.durationMinutes ?? service.durationMinutes
  )
}
