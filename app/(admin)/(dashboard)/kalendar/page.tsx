import type { Metadata } from "next";
import { prisma } from "@/lib/prisma.ts";
import {
    toDateOnly,
    getCzechToday,
    startOfWeekUtc,
    addUtcDays,
} from "@/lib/utils.ts";
import { resolveDayTimeSlots } from "@/lib/availability.ts";
import { DayNav } from "@/components/admin/day-nav.tsx";
import { DayTimeline } from "@/components/admin/day-timeline.tsx";
import { WeekTimeline } from "@/components/admin/week-timeline.tsx";
import { AddBookingDialog } from "@/components/admin/add-booking-dialog.tsx";
import { QuickQrDialog } from "@/components/admin/quick-qr-dialog.tsx";
import { FloatingActions } from "@/components/admin/floating-actions.tsx";

export const metadata: Metadata = {
    title: "Kalendář",
};

export default async function AdminHomePage({
    searchParams,
}: {
    searchParams: Promise<{ date?: string }>;
}) {
    const { date: dateParam } = await searchParams;
    const date = dateParam ? toDateOnly(new Date(dateParam)) : getCzechToday();

    const services = await prisma.service.findMany({ orderBy: { id: "asc" } });
    const clients = await prisma.client.findMany({
        select: { id: true, name: true, phone: true, email: true },
        orderBy: { name: "asc" },
    });

    const weekStart = startOfWeekUtc(date);
    const weekDays = Array.from({ length: 7 }, (_, i) =>
        addUtcDays(weekStart, i)
    );
    const weekEnd = weekDays[6];

    // Both timelines render on every request — which one is visible is a
    // pure CSS decision (see DayNav/the lg:hidden wrappers below) — so
    // fetch once for the whole week and derive the single day's data from
    // it instead of querying twice.
    const [bookings, recurring, exceptions] = await Promise.all([
        prisma.booking.findMany({
            where: { date: { in: weekDays }, status: "CONFIRMED" },
            include: { client: true, service: true },
            orderBy: { startTime: "asc" },
        }),
        prisma.recurringAvailability.findMany(),
        prisma.availabilityException.findMany({
            where: { date: { in: weekDays } },
        }),
    ]);

    const windowsByDay = weekDays.map((d) =>
        resolveDayTimeSlots(
            recurring
                .filter((r) => r.dayOfWeek === d.getUTCDay())
                .map((r) => ({ start: r.startTime, end: r.endTime })),
            exceptions
                .filter((e) => e.date.getTime() === d.getTime())
                .map((e) => ({
                    type: e.type,
                    start: e.startTime,
                    end: e.endTime,
                }))
        )
    );

    const bookingsByDay = weekDays.map((d) =>
        bookings.filter((b) => b.date.getTime() === d.getTime())
    );

    const exceptionsByDay = weekDays.map((d) =>
        exceptions.filter((e) => e.date.getTime() === d.getTime())
    );

    const dayIndex = weekDays.findIndex((d) => d.getTime() === date.getTime());
    const windows = windowsByDay[dayIndex];
    const dayBookings = bookingsByDay[dayIndex];
    const dayExceptions = exceptionsByDay[dayIndex];

    // An empty weekend day just eats up column width for nothing — on a
    // tablet-width screen that's the difference between the week fitting
    // and needing a horizontal scroll. A weekday stays visible even when
    // empty (it's still where new bookings get added), and a weekend day
    // with at least one booking stays too.
    const weekViewIndexes = weekDays
        .map((_, i) => i)
        .filter((i) => {
            const isWeekend = [0, 6].includes(weekDays[i].getUTCDay());
            return !isWeekend || bookingsByDay[i].length > 0;
        });
    const visibleWeekDays = weekViewIndexes.map((i) => weekDays[i]);
    const visibleWindowsByDay = weekViewIndexes.map((i) => windowsByDay[i]);
    const visibleBookingsByDay = weekViewIndexes.map((i) => bookingsByDay[i]);
    const visibleExceptionsByDay = weekViewIndexes.map(
        (i) => exceptionsByDay[i]
    );

    return (
        <div className="flex h-full w-full flex-col">
            <div className="sticky top-0 z-10 bg-background">
                <div className="mx-auto w-full max-w-lg">
                    <DayNav
                        date={date}
                        weekStart={weekStart}
                        weekEnd={weekEnd}
                    />
                </div>
            </div>

            <div className="mx-auto w-full max-w-lg md:hidden">
                <DayTimeline
                    windows={windows}
                    bookings={dayBookings}
                    exceptions={dayExceptions}
                    services={services}
                />
            </div>

            <div className="hidden min-h-0 flex-1 md:block">
                <WeekTimeline
                    weekDays={visibleWeekDays}
                    windowsByDay={visibleWindowsByDay}
                    bookingsByDay={visibleBookingsByDay}
                    exceptionsByDay={visibleExceptionsByDay}
                    services={services}
                />
            </div>

            <FloatingActions>
                <QuickQrDialog />
                <AddBookingDialog
                    services={services}
                    clients={clients}
                    defaultDate={date}
                />
            </FloatingActions>
        </div>
    );
}
