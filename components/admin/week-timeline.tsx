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

    // The header row (weekday labels) and the time-axis both need to stay
    // in view while scrolling — the header pinned vertically, the axis
    // pinned horizontally. That only works if they and the grid share a
    // single scrolling ancestor: nesting a separate overflow-x-auto div
    // around just the columns (as before) implicitly forces that div's
    // overflow-y to "auto" too (a CSS quirk — setting overflow-x alone
    // promotes the other axis from visible to auto), which makes it the
    // nearest scroll container for position:sticky and swallows the
    // stickiness before it ever reaches the page's real scroll. So this
    // whole grid — axis and columns together — is one overflow-auto box,
    // and the header/axis stick to that box directly.
    return (
        <div className="h-full overflow-auto">
            <div className="flex p-3 mb-16">
                <div
                    className="sticky left-0 z-10 w-12 shrink-0 bg-background"
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

                <div className="flex flex-1 gap-px">
                    {weekDays.map((day, dayIndex) => {
                        const windows = windowsByDay[dayIndex];
                        const closed = windows.length === 0;
                        const isToday = day.getTime() === today.getTime();

                        return (
                            <div
                                key={day.toISOString()}
                                className="flex min-w-48 flex-1 flex-col"
                            >
                                <div
                                    className={cn(
                                        "sticky top-0 z-10 bg-background pb-1 text-center text-xs",
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
                                                top:
                                                    (h - gridStart) *
                                                    PX_PER_MIN,
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
                                            onSelectAction={() =>
                                                setSelected(b)
                                            }
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <BookingDetailDialog
                booking={selected}
                allBookings={allBookings}
                onOpenChange={(open) => !open && setSelected(null)}
            />
        </div>
    );
}
