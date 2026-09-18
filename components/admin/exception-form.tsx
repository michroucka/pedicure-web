"use client";

import { useState, useTransition, type ComponentProps } from "react";
import { format, addDays } from "date-fns";
import { cs } from "date-fns/locale";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar.tsx";
import { ExceptionDot } from "@/components/admin/exception-dot.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Slider } from "@/components/ui/slider.tsx";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { AlertCircle, Plus, Trash2, Check } from "lucide-react";
import { toUtcMidnight, formatTime } from "@/lib/utils.ts";
import {
    saveDayOverride,
    checkDayOverrideConflicts,
    type ExceptionConflict,
} from "@/app/(admin)/(dashboard)/dostupnost/actions.ts";
import {
    diffDayBlocks,
    resolveDayTimeSlots,
    type TimeSlot,
} from "@/lib/availability.ts";
import type {
    AvailabilityException,
    RecurringAvailability,
} from "@/lib/generated/prisma/client";
import type { DayButton } from "react-day-picker";
import { Spinner } from "@/components/ui/spinner.tsx";

const SLIDER_STEP = 15;
// Fallback track bounds when a day has no blocks yet to derive a range
// from — widened automatically (see trackBoundsFor) to always fit whatever
// real data ends up on it.
const DEFAULT_TRACK: TimeSlot = { start: 6 * 60, end: 22 * 60 };

type Block = { id: string; start: number; end: number };

function trackBoundsFor(recurringForDay: TimeSlot[], blocks: Block[]) {
    const times = [
        DEFAULT_TRACK.start,
        DEFAULT_TRACK.end,
        ...recurringForDay.flatMap((r) => [r.start, r.end]),
        ...blocks.flatMap((b) => [b.start, b.end]),
    ];
    return {
        min: Math.floor(Math.min(...times) / 60) * 60,
        max: Math.ceil(Math.max(...times) / 60) * 60,
    };
}

function newBlockId() {
    return Math.random().toString(36).slice(2);
}

function ExceptionDayButton({
    modifiers,
    children,
    ...props
}: ComponentProps<typeof DayButton>) {
    return (
        <CalendarDayButton
            modifiers={modifiers}
            {...props}
        >
            {children}
            <ExceptionDot
                blockedFull={!!modifiers.blockedFull}
                blockedPartial={!!modifiers.blockedPartial}
                extraOpen={!!modifiers.extraOpen}
            />
        </CalendarDayButton>
    );
}

export function ExceptionForm({
    exceptions,
    recurring,
}: {
    exceptions: AvailabilityException[];
    recurring: RecurringAvailability[];
}) {
    const [date, setDate] = useState<Date>();
    const [blocks, setBlocks] = useState<Block[]>([]);
    const [error, setError] = useState<string>();
    const [conflicts, setConflicts] = useState<ExceptionConflict[] | null>(
        null
    );
    const [isPending, startTransition] = useTransition();

    const minDate = addDays(toUtcMidnight(new Date()), 1);

    const exceptionsByDate = new Map<number, AvailabilityException[]>();
    for (const exception of exceptions) {
        const key = toUtcMidnight(exception.date).getTime();
        const existing = exceptionsByDate.get(key) ?? [];
        existing.push(exception);
        exceptionsByDate.set(key, existing);
    }

    const modifiers = {
        blockedFull: exceptions
            .filter((e) => e.type === "BLOCKED" && e.startTime === null)
            .map((e) => e.date),
        blockedPartial: exceptions
            .filter((e) => e.type === "BLOCKED" && e.startTime !== null)
            .map((e) => e.date),
        extraOpen: exceptions
            .filter((e) => e.type === "EXTRA_OPEN")
            .map((e) => e.date),
    };

    function recurringFor(d: Date): TimeSlot[] {
        const dayOfWeek = d.getUTCDay();
        return recurring
            .filter((r) => r.dayOfWeek === dayOfWeek)
            .map((r) => ({ start: r.startTime, end: r.endTime }));
    }

    function updateDate(d: Date | undefined) {
        setDate(d);
        setConflicts(null);
        setError(undefined);

        if (!d) {
            setBlocks([]);
            return;
        }

        const existing =
            exceptionsByDate.get(toUtcMidnight(d).getTime()) ?? [];
        const resolved = resolveDayTimeSlots(
            recurringFor(d),
            existing.map((e) => ({
                type: e.type,
                start: e.startTime,
                end: e.endTime,
            }))
        );
        setBlocks(
            resolved.map((slot) => ({
                id: newBlockId(),
                start: slot.start,
                end: slot.end,
            }))
        );
    }

    function updateBlock(id: string, start: number, end: number) {
        setBlocks((prev) =>
            prev.map((b) => (b.id === id ? { ...b, start, end } : b))
        );
        setConflicts(null);
    }

    function removeBlock(id: string) {
        setBlocks((prev) => prev.filter((b) => b.id !== id));
        setConflicts(null);
    }

    function addBlock() {
        setConflicts(null);
        if (blocks.length === 0) {
            // Nothing open yet on this day — the recurring schedule (if
            // any) is the most useful starting point, otherwise fall back
            // to the default track's own span.
            const base = date ? recurringFor(date)[0] : undefined;
            const start = base?.start ?? DEFAULT_TRACK.start;
            const end = base?.end ?? DEFAULT_TRACK.start + 240;
            setBlocks([{ id: newBlockId(), start, end }]);
            return;
        }

        const last = blocks.reduce((a, b) => (b.end > a.end ? b : a));
        const bounds = trackBoundsFor(date ? recurringFor(date) : [], blocks);
        const start = Math.min(last.end, bounds.max - SLIDER_STEP);
        const end = Math.min(start + 120, bounds.max);
        setBlocks((prev) => [...prev, { id: newBlockId(), start, end }]);
    }

    function submit() {
        if (!date) {
            setError("Vyberte datum.");
            return;
        }
        setError(undefined);

        const target: TimeSlot[] = [...blocks]
            .sort((a, b) => a.start - b.start)
            .map((b) => ({ start: b.start, end: b.end }));

        for (let i = 1; i < target.length; i++) {
            if (target[i].start < target[i - 1].end) {
                setError("Bloky se překrývají.");
                return;
            }
        }

        const dateStr = format(date, "yyyy-MM-dd");
        const payload = {
            date: dateStr,
            blocks: target.map((t) => ({
                startTime: formatTime(t.start),
                endTime: formatTime(t.end),
            })),
        };

        startTransition(async () => {
            if (conflicts === null) {
                const { blocked } = diffDayBlocks(recurringFor(date), target);

                const found = await checkDayOverrideConflicts(
                    dateStr,
                    blocked
                );
                if (found.length > 0) {
                    setConflicts(found);
                    return;
                }
            }

            const result = await saveDayOverride(payload);
            if (!result.ok) {
                setError(result.error);
                return;
            }
            setDate(undefined);
            setBlocks([]);
            setConflicts(null);
        });
    }

    const bounds = trackBoundsFor(date ? recurringFor(date) : [], blocks);

    return (
        <Card>
            <CardContent className="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
                <Calendar
                    mode="single"
                    locale={cs}
                    selected={date}
                    onSelect={updateDate}
                    disabled={(day) =>
                        toUtcMidnight(day).getTime() < minDate.getTime()
                    }
                    modifiers={modifiers}
                    components={{ DayButton: ExceptionDayButton }}
                    className="w-full bg-transparent"
                    fixedWeeks
                />

                <div className="flex flex-col gap-3">
                    {!date ? (
                        <p className="text-sm text-muted-foreground">
                            Vyber datum v kalendáři.
                        </p>
                    ) : (
                        <>
                            {blocks.length === 0 && (
                                <p className="text-sm text-muted-foreground">
                                    Tento den je zavřený.
                                </p>
                            )}

                            <div className="flex flex-col gap-3">
                                {blocks.map((block) => (
                                    <div
                                        key={block.id}
                                        className="flex items-center gap-3 rounded-2xl border p-3"
                                    >
                                        <div className="flex-1">
                                            <Slider
                                                value={[
                                                    block.start,
                                                    block.end,
                                                ]}
                                                onValueChange={([
                                                    start,
                                                    end,
                                                ]) =>
                                                    updateBlock(
                                                        block.id,
                                                        start,
                                                        end
                                                    )
                                                }
                                                min={bounds.min}
                                                max={bounds.max}
                                                step={SLIDER_STEP}
                                                minStepsBetweenThumbs={1}
                                            />
                                            <div className="mt-2 flex justify-between text-sm tabular-nums text-muted-foreground">
                                                <span>
                                                    {formatTime(block.start)}
                                                </span>
                                                <span>
                                                    {formatTime(block.end)}
                                                </span>
                                            </div>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon-sm"
                                            onClick={() =>
                                                removeBlock(block.id)
                                            }
                                        >
                                            <Trash2 className="size-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>

                            <Button
                                type="button"
                                variant="outline"
                                onClick={addBlock}
                            >
                                <Plus className="size-4" />
                                Blok
                            </Button>

                            {error && (
                                <Alert variant="destructive">
                                    <AlertCircle />
                                    <AlertTitle>{error}</AlertTitle>
                                </Alert>
                            )}

                            {conflicts && conflicts.length > 0 && (
                                <Alert variant="warning">
                                    <AlertCircle />
                                    <AlertTitle>
                                        V tomto termínu{" "}
                                        {conflicts.length > 1
                                            ? "jsou"
                                            : "je"}{" "}
                                        rezervace
                                    </AlertTitle>
                                    <AlertDescription>
                                        {conflicts.map((c, i) => (
                                            <div key={i}>
                                                {c.clientName} •{" "}
                                                {formatTime(c.startTime)}–
                                                {formatTime(c.endTime)}
                                            </div>
                                        ))}
                                        Rezervaci je potřeba zrušit nebo
                                        přesunout ručně.
                                    </AlertDescription>
                                </Alert>
                            )}

                            <Button
                                type="button"
                                disabled={isPending}
                                onClick={submit}
                            >
                                {isPending ? (
                                    <Spinner className="size-4" />
                                ) : (
                                    <Check className="size-4" />
                                )}
                                {isPending ? "Ukládám…" : "Uložit"}
                            </Button>
                        </>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
