"use client";

import { useState, type MouseEvent } from "react";
import { Plus } from "lucide-react";
import { formatTime } from "@/lib/utils";
import { useOpenAddBooking } from "@/components/admin/add-booking-launcher";

const TAP_STEP_MINUTES = 15;

// Fills a day column under its booking cards: tapping empty space opens
// "Přidat rezervaci" for that day and the tapped quarter hour. Cards sit
// on top, so tapping one still opens its detail instead.
export function TapToBookLayer({
    date,
    gridStart,
    gridEnd,
    pxPerMinute,
}: {
    date: Date;
    gridStart: number;
    gridEnd: number;
    pxPerMinute: number;
}) {
    const openAddBooking = useOpenAddBooking();
    // Mouse only – on touch a tap opens the dialog straight away.
    const [hoveredStart, setHoveredStart] = useState<number | null>(null);

    function startAt(event: MouseEvent<HTMLDivElement>) {
        const offsetY =
            event.clientY - event.currentTarget.getBoundingClientRect().top;
        const minutes =
            gridStart +
            Math.floor(offsetY / pxPerMinute / TAP_STEP_MINUTES) *
                TAP_STEP_MINUTES;
        return Math.min(
            Math.max(minutes, gridStart),
            gridEnd - TAP_STEP_MINUTES
        );
    }

    return (
        <div
            className="absolute inset-0 cursor-pointer"
            onClick={(event) =>
                openAddBooking({ date, startMinutes: startAt(event) })
            }
            onPointerMove={(event) =>
                setHoveredStart(
                    event.pointerType === "mouse" ? startAt(event) : null
                )
            }
            onPointerLeave={() => setHoveredStart(null)}
        >
            {hoveredStart !== null && (
                <div
                    className="pointer-events-none absolute inset-x-1 flex items-center gap-1 rounded-sm border border-dashed border-primary/50 bg-primary/5 px-1.5 text-xs text-primary tabular-nums"
                    style={{
                        top: (hoveredStart - gridStart) * pxPerMinute,
                        height: TAP_STEP_MINUTES * pxPerMinute,
                    }}
                >
                    <Plus className="size-3" />
                    {formatTime(hoveredStart)}
                </div>
            )}
        </div>
    );
}
