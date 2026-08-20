"use client";

import { useState } from "react";
import { formatTime } from "@/lib/utils.ts";
import { BookingDetailDialog } from "@/components/admin/booking-detail-dialog.tsx";
import {
    BookingCard,
    SERVICE_COLORS,
    type BookingItem,
} from "@/components/admin/booking-card.tsx";
import type { Service } from "@/lib/generated/prisma/client.ts";

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
                    <BookingCard
                        key={b.id}
                        booking={b}
                        top={(b.startTime - gridStart) * PX_PER_MIN}
                        height={Math.max(
                            (b.endTime - b.startTime) * PX_PER_MIN,
                            24
                        )}
                        colorClass={colorByService.get(b.serviceId)}
                        onSelectAction={() => setSelected(b)}
                    />
                ))}
            </div>

            <BookingDetailDialog
                booking={selected}
                onOpenChange={(open) => !open && setSelected(null)}
            />
        </div>
    );
}
