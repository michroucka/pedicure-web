"use client";

import { cn, formatTime } from "@/lib/utils.ts";
import type {
    Booking,
    Client,
    Service,
} from "@/lib/generated/prisma/client.ts";

export type BookingItem = Booking & { client: Client; service: Service };

// Already started (or on an earlier day) — dimmed in the timeline, but
// cancel/move stay fully usable (no-shows get rebooked after the fact).
export function isBookingPast(
    booking: BookingItem,
    today: Date,
    nowMinutes: number
): boolean {
    if (booking.date.getTime() < today.getTime()) return true;
    if (booking.date.getTime() > today.getTime()) return false;
    return booking.startTime <= nowMinutes;
}

export const SERVICE_COLORS = [
    "border-chart-1/25 border-l-chart-1",
    "border-chart-2/25 border-l-chart-2",
    "border-chart-3/25 border-l-chart-3",
    "border-chart-4/25 border-l-chart-4",
    "border-chart-5/25 border-l-chart-5",
];

export function BookingCard({
    booking,
    top,
    height,
    colorClass,
    past,
    onSelectAction,
}: {
    booking: BookingItem;
    top: number;
    height: number;
    colorClass: string | undefined;
    past?: boolean;
    onSelectAction: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onSelectAction}
            className={cn(
                "absolute right-1 left-1 flex cursor-pointer items-center justify-between gap-2 overflow-hidden rounded-sm border border-l-4 bg-card px-2 py-1 text-left text-sm transition hover:opacity-90",
                colorClass,
                past && "opacity-45"
            )}
            style={{ top, height }}
        >
            <div className="min-w-0">
                <div className="truncate max-2xl:text-xs font-medium">
                    {booking.client.name}
                </div>
                <div className="truncate text-xxs 2xl:text-xs text-muted-foreground">
                    {booking.service.name}
                    {booking.client.extraTimeMinutes > 0 && "+"}
                </div>
            </div>
            <div className="shrink-0 text-right text-xs">
                <div className="tabular-nums font-medium text-foreground">
                    {formatTime(booking.startTime)}
                </div>
                <div className="tabular-nums font-medium text-muted-foreground">
                    {formatTime(booking.endTime)}
                </div>
            </div>
        </button>
    );
}
