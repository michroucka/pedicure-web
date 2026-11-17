"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { Plus } from "lucide-react";
import { cn, formatTime } from "@/lib/utils";
import { useOpenAddBooking } from "@/components/admin/add-booking-launcher";
import { resolveTapToBookStart } from "@/lib/tap-to-book-start";

const TAP_STEP_MINUTES = 15;
// An untouched mark goes away on its own – the way out of a stray tap.
const MARK_TIMEOUT_MS = 3000;

// Fills a day column under its booking cards: tapping empty space opens
// "Přidat rezervaci" for that day and the tapped quarter hour. Cards sit
// on top, so tapping one still opens its detail instead.
//
// A mouse click opens the dialog straight away (hover already shows the
// time). A touch is two-step: the first tap only marks the quarter hour,
// tapping the mark opens the dialog – a stray tap opens nothing and shows
// which time was hit before committing to it.
//
// Gaps too short for the shortest service offer nothing, and a tap late in
// a gap moves back to where that service still fits (resolveTapToBookStart).
export function TapToBookLayer({
    date,
    gridStart,
    gridEnd,
    pxPerMinute,
    bookings,
    minDurationMinutes,
}: {
    date: Date;
    gridStart: number;
    gridEnd: number;
    pxPerMinute: number;
    bookings: { startTime: number; endTime: number }[];
    minDurationMinutes: number;
}) {
    const openAddBooking = useOpenAddBooking();
    const layerRef = useRef<HTMLDivElement>(null);
    const lastPointerTypeRef = useRef<string>("mouse");
    // "blocked": the mouse is over a gap with nothing to offer.
    const [hovered, setHovered] = useState<number | "blocked" | null>(null);
    const [markedStart, setMarkedStart] = useState<number | null>(null);

    // A tap anywhere outside this day, or a few seconds without one, drops
    // the mark. Moving the mark starts the countdown again.
    useEffect(() => {
        if (markedStart === null) return;
        function handlePointerDown(event: PointerEvent) {
            if (layerRef.current?.contains(event.target as Node)) return;
            setMarkedStart(null);
        }
        document.addEventListener("pointerdown", handlePointerDown);
        const timeout = setTimeout(() => setMarkedStart(null), MARK_TIMEOUT_MS);
        return () => {
            document.removeEventListener("pointerdown", handlePointerDown);
            clearTimeout(timeout);
        };
    }, [markedStart]);

    function startAt(event: MouseEvent<HTMLDivElement>) {
        const offsetY =
            event.clientY - event.currentTarget.getBoundingClientRect().top;
        const minutes =
            gridStart +
            Math.floor(offsetY / pxPerMinute / TAP_STEP_MINUTES) *
                TAP_STEP_MINUTES;
        const tapped = Math.min(
            Math.max(minutes, gridStart),
            gridEnd - TAP_STEP_MINUTES
        );
        return resolveTapToBookStart({ tapped, bookings, minDurationMinutes });
    }

    function handleClick(event: MouseEvent<HTMLDivElement>) {
        const start = startAt(event);
        if (start === null) {
            setMarkedStart(null);
            return;
        }
        const isTouch = lastPointerTypeRef.current !== "mouse";
        if (isTouch && markedStart !== start) {
            setMarkedStart(start);
            return;
        }
        setMarkedStart(null);
        openAddBooking({ date, startMinutes: start });
    }

    const shownStart =
        markedStart ?? (typeof hovered === "number" ? hovered : null);

    return (
        <div
            ref={layerRef}
            className={cn(
                "absolute inset-0",
                hovered === "blocked" ? "cursor-default" : "cursor-pointer"
            )}
            onPointerDown={(event) => {
                lastPointerTypeRef.current = event.pointerType;
            }}
            onClick={handleClick}
            onPointerMove={(event) =>
                setHovered(
                    event.pointerType === "mouse"
                        ? (startAt(event) ?? "blocked")
                        : null
                )
            }
            onPointerLeave={() => setHovered(null)}
        >
            {shownStart !== null && (
                <div
                    // Keyed by the marked time, so moving the mark restarts
                    // its fade-out along with the timeout.
                    key={markedStart ?? "hover"}
                    className={cn(
                        "pointer-events-none absolute inset-x-1 flex items-center gap-1 rounded-sm border px-1.5 text-xs text-primary tabular-nums",
                        markedStart !== null
                            ? "border-primary bg-primary/10 font-medium"
                            : "border-dashed border-primary/50 bg-primary/5"
                    )}
                    style={{
                        top: (shownStart - gridStart) * pxPerMinute,
                        height: TAP_STEP_MINUTES * pxPerMinute,
                        animation:
                            markedStart !== null
                                ? `tap-mark-expire ${MARK_TIMEOUT_MS}ms forwards`
                                : undefined,
                    }}
                >
                    <Plus className="size-3" />
                    {formatTime(shownStart)}
                </div>
            )}
        </div>
    );
}
