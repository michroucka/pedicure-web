"use client";

import { useState } from "react";
import { formatTime, getCzechToday, getCzechNowMinutes } from "@/lib/utils.ts";
import { categorizeExceptions, computeClosedRanges } from "@/lib/availability.ts";
import { BookingDetailDialog } from "@/components/admin/booking-detail-dialog.tsx";
import { ExceptionDot } from "@/components/admin/exception-dot.tsx";
import {
    BookingCard,
    SERVICE_COLORS,
    isBookingPast,
    type BookingItem,
} from "@/components/admin/booking-card.tsx";
import type {
    AvailabilityException,
    Service,
} from "@/lib/generated/prisma/client.ts";

const PX_PER_MIN = 1.5;

const EXCEPTION_LABELS = {
    blockedFull: "Zavřeno celý den",
    mixed: "Upravená dostupnost",
    blockedPartial: "Částečně zablokováno",
    extraOpen: "Otevřeno navíc",
};

export function DayTimeline({
    windows,
    bookings,
    exceptions,
    services,
}: {
    windows: { start: number; end: number }[];
    bookings: BookingItem[];
    exceptions: AvailabilityException[];
    services: Service[];
}) {
    const [selected, setSelected] = useState<BookingItem | null>(null);

    const { blockedFull, blockedPartial, extraOpen } =
        categorizeExceptions(exceptions);

    if (windows.length === 0 && bookings.length === 0) {
        return (
            <div className="flex flex-col items-center gap-1 p-6 text-center text-sm text-muted-foreground">
                {blockedFull && (
                    <ExceptionDot
                        blockedFull={blockedFull}
                        blockedPartial={blockedPartial}
                        extraOpen={extraOpen}
                    />
                )}
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
    const nowMinutes = getCzechNowMinutes();

    const exceptionLabel = blockedFull
        ? EXCEPTION_LABELS.blockedFull
        : blockedPartial && extraOpen
          ? EXCEPTION_LABELS.mixed
          : blockedPartial
            ? EXCEPTION_LABELS.blockedPartial
            : extraOpen
              ? EXCEPTION_LABELS.extraOpen
              : undefined;

    return (
        <div className="flex flex-col px-4 py-3 mb-16">
            {exceptionLabel && (
                <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <ExceptionDot
                        blockedFull={blockedFull}
                        blockedPartial={blockedPartial}
                        extraOpen={extraOpen}
                    />
                    {exceptionLabel}
                </div>
            )}

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
