"use client";

import { useState } from "react";
import { cn, formatTime } from "@/lib/utils.ts";
import { BookingDetailDialog } from "@/components/booking-detail-dialog.tsx";
import type {
    Booking,
    Client,
    Service,
} from "@/lib/generated/prisma/client.ts";

export type BookingItem = Booking & { client: Client; service: Service };

const SERVICE_COLORS = [
    "border-chart-1/25 border-l-chart-1",
    "border-chart-2/25 border-l-chart-2",
    "border-chart-3/25 border-l-chart-3",
    "border-chart-4/25 border-l-chart-4",
    "border-chart-5/25 border-l-chart-5",
];

const PX_PER_MIN = 1.5;

export function DayTimeline({
    windows,
    bookings,
    services,
}: {
    windows: { start: number; end: number }[];
    bookings: BookingItem[];
    services: Service[];
}) {
    const [selected, setSelected] = useState<BookingItem | null>(null);

    if (windows.length === 0) {
        return (
            <div className="p-6 text-center text-sm text-muted-foreground">
                Zavřeno
            </div>
        );
    }

    const gridStart =
        Math.floor(Math.min(...windows.map((w) => w.start)) / 60) * 60;
    const gridEnd = Math.ceil(Math.max(...windows.map((w) => w.end)) / 60) * 60;

    const hours: number[] = [];
    for (let h = gridStart; h <= gridEnd; h += 60) hours.push(h);

    const colorByService = new Map(
        services.map((s, i) => [
            s.id,
            SERVICE_COLORS[i % SERVICE_COLORS.length],
        ])
    );

    return (
        <div className="flex px-4 py-3">
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
                {hours.map((h) => (
                    <div
                        key={h}
                        className="absolute inset-x-0 border-t"
                        style={{ top: (h - gridStart) * PX_PER_MIN }}
                    />
                ))}

                {bookings.map((b) => (
                    <button
                        key={b.id}
                        type="button"
                        onClick={() => setSelected(b)}
                        className={cn(
                            "absolute right-1 left-1 flex cursor-pointer items-center justify-between gap-2 overflow-hidden rounded-lg border border-l-4 bg-card px-2 py-1 text-left text-sm transition hover:opacity-90",
                            colorByService.get(b.serviceId)
                        )}
                        style={{
                            top: (b.startTime - gridStart) * PX_PER_MIN,
                            height:
                                Math.max(
                                    (b.endTime - b.startTime) * PX_PER_MIN,
                                    24
                                ),
                        }}
                    >
                        <div className="min-w-0">
                            <div className="truncate font-medium">
                                {b.client.name}
                            </div>
                            <div className="truncate text-xs text-muted-foreground">
                                {b.service.name}
                            </div>
                        </div>
                        <div className="shrink-0 text-right text-xs">
                            <div className="font-mono font-medium text-foreground">
                                {formatTime(b.startTime)}
                            </div>
                            <div className="font-mono font-medium text-muted-foreground">
                                {formatTime(b.endTime)}
                            </div>
                        </div>
                    </button>
                ))}
            </div>

            <BookingDetailDialog
                booking={selected}
                onOpenChange={(open) => !open && setSelected(null)}
            />
        </div>
    );
}
