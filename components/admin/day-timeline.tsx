"use client";

import { useEffect, useState } from "react";
import { formatTime, getCzechToday, getCzechNowMinutes } from "@/lib/utils.ts";
import { computeClosedRanges } from "@/lib/availability.ts";
import { BookingDetailDialog } from "@/components/admin/booking-detail-dialog.tsx";
import {
    BookingCard,
    SERVICE_COLORS,
    isBookingPast,
    type BookingItem,
} from "@/components/admin/booking-card.tsx";
import type {
    Service,
} from "@/lib/generated/prisma/client.ts";

const PX_PER_MIN = 2.25;

export function DayTimeline({
    windows,
    bookings,
    services,
    date
}: {
    windows: { start: number; end: number }[];
    bookings: BookingItem[];
    services: Service[];
    date: Date;
}) {
    const [selected, setSelected] = useState<BookingItem | null>(null);
    const [nowMinutes, setNowMinutes] = useState<number>(15 * 60 + 30); // TODO: remove, temp for testing

    useEffect(() => {
        const id = setInterval(
            () => setNowMinutes(getCzechNowMinutes()),
            10_000
        );
        return () => clearInterval(id);
    }, []);

    if (windows.length === 0 && bookings.length === 0) {
        return (
            <div className="flex flex-col items-center gap-1 p-6 text-center text-sm text-muted-foreground">
                Zavřeno
            </div>
        );
    }

    // Bounds normally follow the availability windows, but a booking made
    // outside opening hours (admin "vlastní čas") can fall outside them —
    // stretch the grid to still fit it.
    const boundPoints = [
        ...windows.map((w) => w.start),
        ...windows.map((w) => w.end),
        ...bookings.map((b) => b.startTime),
        ...bookings.map((b) => b.endTime),
    ];
    const gridStart = Math.floor(Math.min(...boundPoints) / 60) * 60;
    const gridEnd = Math.ceil(Math.max(...boundPoints) / 60) * 60;

    const hours: number[] = [];
    for (let h = gridStart; h <= gridEnd; h += 60) hours.push(h);

    const closedRanges = computeClosedRanges(windows, gridStart, gridEnd);

    const colorByService = new Map(
        services.map((s, i) => [
            s.id,
            SERVICE_COLORS[i % SERVICE_COLORS.length],
        ])
    );

    const today = getCzechToday();
    const isToday = date.getTime() === today.getTime();

    return (
        <div className="mb-16 flex flex-col px-4 py-3">
            <div className="flex">
                <div
                    className="relative w-12 shrink-0"
                    style={{ height: (gridEnd - gridStart) * PX_PER_MIN }}
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

                <div
                    className="relative flex-1 border-x"
                    style={{ height: (gridEnd - gridStart) * PX_PER_MIN }}
                >
                    {closedRanges.map((r) => (
                        <div
                            key={r.start}
                            className="absolute inset-x-0 bg-muted/60"
                            style={{
                                top: (r.start - gridStart) * PX_PER_MIN,
                                height: (r.end - r.start) * PX_PER_MIN,
                            }}
                        />
                    ))}

                    {hours.map((h) => (
                        <div
                            key={h}
                            className="absolute inset-x-0 border-t"
                            style={{ top: (h - gridStart) * PX_PER_MIN }}
                        />
                    ))}

                    {bookings.map((b) => (
                        <BookingCard
                            key={b.id}
                            booking={b}
                            top={(b.startTime - gridStart) * PX_PER_MIN}
                            height={Math.max(
                                (b.endTime - b.startTime) * PX_PER_MIN,
                                24
                            )}
                            colorClass={colorByService.get(b.serviceId)}
                            past={isBookingPast(b, today, nowMinutes)}
                            onSelectAction={() => setSelected(b)}
                        />
                    ))}
                    {isToday &&
                        nowMinutes >= gridStart &&
                        nowMinutes <= gridEnd && (
                            <>
                                <div
                                    className="absolute inset-x-0 z-10 border-t border-red-500"
                                    style={{
                                        top:
                                            (nowMinutes - gridStart) *
                                            PX_PER_MIN,
                                    }}
                                />
                                <div
                                    className="py-1/2 absolute left-0 z-10 -translate-x-9.5 -translate-y-1/2 rounded-full bg-red-500 px-1 text-[11px] text-white tabular-nums"
                                    style={{
                                        top:
                                            (nowMinutes - gridStart) *
                                            PX_PER_MIN,
                                    }}
                                >
                                    {formatTime(nowMinutes)}
                                </div>
                            </>
                        )}
                </div>
            </div>

            <BookingDetailDialog
                booking={selected}
                allBookings={bookings}
                services={services}
                onOpenChange={(open) => !open && setSelected(null)}
            />
        </div>
    );
}
