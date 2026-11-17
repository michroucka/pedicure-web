"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { Plus } from "lucide-react";
import { cn, formatTime } from "@/lib/utils";
import { useOpenAddBooking } from "@/components/admin/add-booking-launcher";

const TAP_STEP_MINUTES = 15;

// Fills a day column under its booking cards: tapping empty space opens
// "Přidat rezervaci" for that day and the tapped quarter hour. Cards sit
// on top, so tapping one still opens its detail instead.
//
// A mouse click opens the dialog straight away (hover already shows the
// time). A touch is two-step: the first tap only marks the quarter hour,
// tapping the mark opens the dialog – a stray tap opens nothing and shows
// which time was hit before committing to it.
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
    const layerRef = useRef<HTMLDivElement>(null);
    const lastPointerTypeRef = useRef<string>("mouse");
    const [hoveredStart, setHoveredStart] = useState<number | null>(null);
    const [markedStart, setMarkedStart] = useState<number | null>(null);

    // A tap anywhere outside this day drops its mark.
    useEffect(() => {
        if (markedStart === null) return;
        function handlePointerDown(event: PointerEvent) {
            if (layerRef.current?.contains(event.target as Node)) return;
            setMarkedStart(null);
        }
        document.addEventListener("pointerdown", handlePointerDown);
        return () =>
            document.removeEventListener("pointerdown", handlePointerDown);
    }, [markedStart]);

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

    function handleClick(event: MouseEvent<HTMLDivElement>) {
        const start = startAt(event);
        const isTouch = lastPointerTypeRef.current !== "mouse";
        if (isTouch && markedStart !== start) {
            setMarkedStart(start);
            return;
        }
        setMarkedStart(null);
        openAddBooking({ date, startMinutes: start });
    }

    const shownStart = markedStart ?? hoveredStart;

    return (
        <div
            ref={layerRef}
            className="absolute inset-0 cursor-pointer"
            onPointerDown={(event) => {
                lastPointerTypeRef.current = event.pointerType;
            }}
            onClick={handleClick}
            onPointerMove={(event) =>
                setHoveredStart(
                    event.pointerType === "mouse" ? startAt(event) : null
                )
            }
            onPointerLeave={() => setHoveredStart(null)}
        >
            {shownStart !== null && (
                <div
                    className={cn(
                        "pointer-events-none absolute inset-x-1 flex items-center gap-1 rounded-sm border px-1.5 text-xs text-primary tabular-nums",
                        markedStart !== null
                            ? "border-primary bg-primary/10 font-medium"
                            : "border-dashed border-primary/50 bg-primary/5"
                    )}
                    style={{
                        top: (shownStart - gridStart) * pxPerMinute,
                        height: TAP_STEP_MINUTES * pxPerMinute,
                    }}
                >
                    <Plus className="size-3" />
                    {formatTime(shownStart)}
                </div>
            )}
        </div>
    );
}
