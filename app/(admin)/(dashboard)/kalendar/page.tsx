import type { Metadata } from "next";
import type { ReactNode } from "react";
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

export const metadata: Metadata = {
    title: "Kalendář",
};

export default async function AdminHomePage({
    searchParams,
}: {
    searchParams: Promise<{ date?: string; view?: string }>;
}) {
    const { date: dateParam, view: viewParam } = await searchParams;
    const date = dateParam ? toDateOnly(new Date(dateParam)) : getCzechToday();
    const view = viewParam === "week" ? "week" : "day";

    const services = await prisma.service.findMany({ orderBy: { id: "asc" } });

    let weekStart: Date | undefined;
    let weekEnd: Date | undefined;
    let timeline: ReactNode;

    if (view === "week") {
        weekStart = startOfWeekUtc(date);
        const weekDays = Array.from({ length: 7 }, (_, i) =>
            addUtcDays(weekStart!, i)
        );
        weekEnd = weekDays[6];

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

        timeline = (
            <WeekTimeline
                weekDays={weekDays}
                windowsByDay={windowsByDay}
                bookingsByDay={bookingsByDay}
                services={services}
            />
        );
    } else {
        const [bookings, recurring, exceptions] = await Promise.all([
            prisma.booking.findMany({
                where: { date, status: "CONFIRMED" },
                include: { client: true, service: true },
                orderBy: { startTime: "asc" },
            }),
            prisma.recurringAvailability.findMany({
                where: { dayOfWeek: date.getUTCDay() },
            }),
            prisma.availabilityException.findMany({ where: { date } }),
        ]);

        const windows = resolveDayTimeSlots(
            recurring.map((r) => ({ start: r.startTime, end: r.endTime })),
            exceptions.map((e) => ({
                type: e.type,
                start: e.startTime,
                end: e.endTime,
            }))
        );

        timeline = (
            <div className="mx-auto w-full max-w-lg">
                <DayTimeline
                    windows={windows}
                    bookings={bookings}
                    services={services}
                />
            </div>
        );
    }

    return (
        <div className="flex h-full w-full flex-col">
            <div className="mx-auto w-full max-w-lg">
                <DayNav
                    date={date}
                    view={view}
                    weekStart={weekStart}
                    weekEnd={weekEnd}
                />
            </div>
            {timeline}
            <div className="mx-auto w-full max-w-lg">
                <AddBookingDialog
                    services={services}
                    defaultDate={date}
                />
            </div>
        </div>
    );
}
