import { prisma } from "@/lib/prisma.ts";
import { toDateOnly, getCzechToday } from "@/lib/utils.ts";
import { resolveDayTimeSlots } from "@/lib/availability.ts";
import { DayNav } from "@/components/day-nav.tsx";
import { DayTimeline } from "@/components/day-timeline.tsx";
import { AddBookingDialog } from "@/components/add-booking-dialog.tsx";

export default async function AdminHomePage({
    searchParams,
}: {
    searchParams: Promise<{ date?: string }>;
}) {
    const { date: dateParam } = await searchParams;
    const date = dateParam ? toDateOnly(new Date(dateParam)) : getCzechToday();

    const [bookings, recurring, exceptions, services] = await Promise.all([
        prisma.booking.findMany({
            where: { date, status: "CONFIRMED" },
            include: { client: true, service: true },
            orderBy: { startTime: "asc" },
        }),
        prisma.recurringAvailability.findMany({
            where: { dayOfWeek: date.getUTCDay() },
        }),
        prisma.availabilityException.findMany({ where: { date } }),
        prisma.service.findMany({ orderBy: { id: "asc" } }),
    ]);

    const windows = resolveDayTimeSlots(
        recurring.map((r) => ({ start: r.startTime, end: r.endTime })),
        exceptions.map((e) => ({
            type: e.type,
            start: e.startTime,
            end: e.endTime,
        }))
    );

    return (
        <div className="mx-auto flex h-full w-full max-w-lg flex-col">
            <DayNav date={date} />
            <DayTimeline
                windows={windows}
                bookings={bookings}
                services={services}
            />
            <AddBookingDialog
                services={services}
                defaultDate={date}
            />
        </div>
    );
}
