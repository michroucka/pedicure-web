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
import {
    CalendarBody,
    CalendarNavigationProvider,
} from "@/components/admin/calendar-navigation.tsx";

export const metadata: Metadata = {
    title: "Kalendář",
};

export default async function AdminHomePage({
    searchParams,
}: {
    searchParams: Promise<{ date?: string }>;
}) {
    const { date: dateParam } = await searchParams;
    let today = getCzechToday();
    if ([6, 0].includes(today.getUTCDay())) {
        const weekend = [
            today,
            today.getUTCDay() === 0 ?
                addUtcDays(today, -1) :
                addUtcDays(today, 1)
        ];
        const weekendBookings = await prisma.booking.count({
            where: {
                date: { in: weekend },
                status: "CONFIRMED",
            },
        });
        if (weekendBookings === 0) {
            today = addUtcDays(today, today.getUTCDay() === 6 ? 2 : 1);
        }
    }

    const date = dateParam ? toDateOnly(new Date(dateParam)) : today;

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
        // Scoped to "from today on", not just this week — the date picker's
        // Calendar shows open/closed dots across whole months, and this
        // table is tiny for a single-provider business, so fetching further
        // out than the visible week costs nothing.
        prisma.availabilityException.findMany({
            where: { date: { gte: today } },
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
    // stays too if it has a booking or is open at all (e.g. an EXTRA_OPEN
    // exception with nothing booked into it yet — it still needs to be
    // clickable).
    const weekViewIndexes = weekDays
        .map((_, i) => i)
        .filter((i) => {
            const isWeekend = [0, 6].includes(weekDays[i].getUTCDay());
            return (
                !isWeekend ||
                bookingsByDay[i].length > 0 ||
                windowsByDay[i].length > 0
            );
        });
    const visibleWeekDays = weekViewIndexes.map((i) => weekDays[i]);
    const visibleWindowsByDay = weekViewIndexes.map((i) => windowsByDay[i]);
    const visibleBookingsByDay = weekViewIndexes.map((i) => bookingsByDay[i]);
    const visibleExceptionsByDay = weekViewIndexes.map(
        (i) => exceptionsByDay[i]
    );

    return (
        <CalendarNavigationProvider serverDate={date}>
            <div className="flex h-full w-full flex-col">
                <div className="sticky top-0 z-10 bg-background">
                    <div className="mx-auto w-full max-w-lg">
                        <DayNav
                            weekStart={weekStart}
                            weekEnd={weekEnd}
                            exceptions={dayExceptions}
                            allExceptions={exceptions}
                        />
                    </div>
                </div>

                <CalendarBody>
                    <div className="mx-auto w-full max-w-lg md:hidden">
                        <DayTimeline
                            windows={windows}
                            bookings={dayBookings}
                            services={services}
                            date={date}
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
                </CalendarBody>

                <FloatingActions>
                    <QuickQrDialog />
                    <AddBookingDialog
                        services={services}
                        clients={clients}
                        defaultDate={date}
                    />
                </FloatingActions>
            </div>
        </CalendarNavigationProvider>
    );
}
