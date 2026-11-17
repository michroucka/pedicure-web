"use client";

import { StickyNote, Users } from "lucide-react";
import { cn, formatTime } from "@/lib/utils";
import { getBookingPersonName } from "@/lib/get-booking-person-name";
import type { Booking, Client, Service } from "@/lib/generated/prisma/client";

export type BookingItem = Booking & { client: Client; service: Service };

// Already started (or on an earlier day) – dimmed in the timeline, but
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

// Card and legend-swatch classes per colour, spelled out in full so Tailwind
// sees every class name.
const SERVICE_COLORS = [
    {
        card: "border-chart-1/25 border-l-chart-1 bg-chart-1/3",
        dot: "bg-chart-1",
    },
    {
        card: "border-chart-2/25 border-l-chart-2 bg-chart-2/3",
        dot: "bg-chart-2",
    },
    {
        card: "border-chart-3/25 border-l-chart-3 bg-chart-3/3",
        dot: "bg-chart-3",
    },
    {
        card: "border-chart-4/25 border-l-chart-4 bg-chart-4/3",
        dot: "bg-chart-4",
    },
    {
        card: "border-chart-5/25 border-l-chart-5 bg-chart-5/3",
        dot: "bg-chart-5",
    },
];

// By position in the full service list (inactive ones included), so a
// service keeps its colour when another one is switched off.
export function serviceColorMap(services: Service[]) {
    return new Map(
        services.map((s, i) => [
            s.id,
            SERVICE_COLORS[i % SERVICE_COLORS.length],
        ])
    );
}

// The tap-to-book layer won't offer a gap this one doesn't fit into.
export function shortestActiveServiceMinutes(services: Service[]) {
    const durations = services
        .filter((s) => s.active)
        .map((s) => s.durationMinutes);
    return durations.length > 0 ? Math.min(...durations) : 0;
}

export function ServiceLegend({ services }: { services: Service[] }) {
    const colorByService = serviceColorMap(services);
    return (
        // Week view only: there service names get cut short, while the
        // phone's day view shows them in full on every card.
        <ul className="hidden flex-wrap justify-center gap-x-3 gap-y-1 pb-1 text-xs text-muted-foreground md:flex">
            {services
                .filter((s) => s.active)
                .map((s) => (
                    <li
                        key={s.id}
                        className="flex items-center gap-1.5"
                    >
                        <span
                            className={cn(
                                // A bar like the card's left edge, not a dot -
                                // dots in the day headers mean exceptions.
                                "h-3 w-1 rounded-full",
                                colorByService.get(s.id)?.dot
                            )}
                        />
                        {s.name}
                    </li>
                ))}
        </ul>
    );
}

// Instead of fading the whole card (opacity made the text hard to read),
// only the service colour goes - text keeps its contrast.
const PAST_BOOKING_CLASS =
    "border-border border-l-muted-foreground/40 bg-muted";

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
                past ? PAST_BOOKING_CLASS : colorClass
            )}
            style={{ top, height }}
        >
            <div className="min-w-0">
                <div className="flex items-center gap-1 font-medium max-2xl:text-xs">
                    <span className="truncate">
                        {getBookingPersonName(booking)}
                    </span>
                    {booking.groupId && (
                        <Users
                            className="size-3 shrink-0 text-muted-foreground"
                            aria-label="Skupina"
                        />
                    )}
                    {booking.client.note && (
                        <StickyNote
                            className="size-3 shrink-0 text-muted-foreground"
                            aria-label="Má poznámku"
                        />
                    )}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                    {booking.service.name}
                    {booking.extraTimeMinutes > 0 &&
                        ` +${booking.extraTimeMinutes} min`}
                </div>
            </div>
            <div className="shrink-0 text-right text-xs">
                <div className="font-medium text-foreground tabular-nums">
                    {formatTime(booking.startTime)}
                </div>
                <div className="font-medium text-muted-foreground tabular-nums">
                    {formatTime(booking.endTime)}
                </div>
            </div>
        </button>
    );
}
