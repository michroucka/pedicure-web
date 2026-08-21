"use client";

import { useState } from "react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import {
    cn,
    formatTime,
    toUtcMidnight,
    getCzechToday,
    getCzechNowMinutes,
} from "@/lib/utils.ts";
import { BookingDetailDialog } from "@/components/admin/booking-detail-dialog.tsx";
import {
    BookingCard,
    SERVICE_COLORS,
    isBookingPast,
    type BookingItem,
} from "@/components/admin/booking-card.tsx";
import type { Service } from "@/lib/generated/prisma/client.ts";

const PX_PER_MIN = 1.5;

export function WeekTimeline({
    weekDays,
    windowsByDay,
    bookingsByDay,
    services,
}: {
    weekDays: Date[];
    windowsByDay: { start: number; end: number }[][];
    bookingsByDay: BookingItem[][];
    services: Service[];
}) {
    const [selected, setSelected] = useState<BookingItem | null>(null);

    const allWindows = windowsByDay.flat();
    const allBookings = bookingsByDay.flat();

    if (allWindows.length === 0 && allBookings.length === 0) {
        return (
            <div className="p-6 text-center text-sm text-muted-foreground">
                Zavřeno celý týden
            </div>
        );
    }

    // Bounds normally follow the availability windows, but a booking made
    // outside opening hours (admin "vlastní čas") can fall outside them —
    // stretch the grid to still fit it.
    const boundPoints = [
        ...allWindows.map((w) => w.start),
        ...allWindows.map((w) => w.end),
        ...allBookings.map((b) => b.startTime),
        ...allBookings.map((b) => b.endTime),
    ];
    const gridStart = Math.floor(Math.min(...boundPoints) / 60) * 60;
    const gridEnd = Math.ceil(Math.max(...boundPoints) / 60) * 60;

    const hours: number[] = [];
    for (let h = gridStart; h <= gridEnd; h += 60) hours.push(h);

    const colorByService = new Map(
        services.map((s, i) => [
            s.id,
            SERVICE_COLORS[i % SERVICE_COLORS.length],
        ])
    );

    const gridHeight = (gridEnd - gridStart) * PX_PER_MIN;
    const today = toUtcMidnight(new Date());
    const todayCzech = getCzechToday();
    const nowMinutes = getCzechNowMinutes();

    return (
        <div className="flex p-3">
            <div
                className="relative w-12 shrink-0"
                style={{ height: gridHeight, marginTop: 24 }}
            >
                {hours.map((h) => (
                    <span
                        key={h}
                        className="absolute text-xs text-muted-foreground"
                        style={{ top: (h - gridStart) * PX_PER_MIN - 8 }}
                    >
                        {formatTime(h)}
                    </span>
                ))}
            </div>

            <div className="flex flex-1 gap-px overflow-x-auto">
                {weekDays.map((day, dayIndex) => {
                    const windows = windowsByDay[dayIndex];
                    const closed = windows.length === 0;
                    const isToday = day.getTime() === today.getTime();

                    return (
                        <div
                            key={day.toISOString()}
                            className="flex min-w-40 flex-1 flex-col"
                        >
                            <div
                                className={cn(
                                    "pb-1 text-center text-xs",
                                    isToday
                                        ? "font-semibold text-primary"
                                        : "text-muted-foreground"
                                )}
                            >
                                {format(day, "EEE d.", { locale: cs })}
                            </div>
                            <div
                                className={cn(
                                    "relative border-x",
                                    closed && "bg-muted/40",
                                    isToday && "bg-primary/5"
                                )}
                                style={{ height: gridHeight }}
                            >
                                {hours.map((h) => (
                                    <div
                                        key={h}
                                        className="absolute inset-x-0 border-t"
                                        style={{
                                            top: (h - gridStart) * PX_PER_MIN,
                                        }}
                                    />
                                ))}

                                {bookingsByDay[dayIndex].map((b) => (
                                    <BookingCard
                                        key={b.id}
                                        booking={b}
                                        top={
                                            (b.startTime - gridStart) *
                                            PX_PER_MIN
                                        }
                                        height={Math.max(
                                            (b.endTime - b.startTime) *
                                                PX_PER_MIN,
                                            24
                                        )}
                                        colorClass={colorByService.get(
                                            b.serviceId
                                        )}
                                        past={isBookingPast(
                                            b,
                                            todayCzech,
                                            nowMinutes
                                        )}
                                        onSelectAction={() => setSelected(b)}
                                    />
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            <BookingDetailDialog
                booking={selected}
                allBookings={allBookings}
                onOpenChange={(open) => !open && setSelected(null)}
            />
        </div>
    );
}
