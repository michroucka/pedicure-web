"use client";

import { useState, useTransition } from "react";
import { format, addDays, differenceInCalendarDays } from "date-fns";
import { cs } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { ExceptionDayButton } from "@/components/admin/exception-day-button";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { TimePicker } from "@/components/ui/time-picker";
import { TIME_PICKER_COMMIT_DELAY_MS } from "@/lib/time-picker-commit-delay";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
    AlertCircle,
    Plus,
    Trash2,
    CalendarX,
    CalendarDays,
} from "lucide-react";
import { ExceptionLegend } from "@/components/admin/exception-legend";
import {
    localDateToUtcMidnight,
    formatTime,
    parseTime,
    roundToQuarterHour,
} from "@/lib/utils";
import {
    saveDayOverride,
    checkDayOverrideConflicts,
    saveCloseRange,
    checkRangeConflicts,
    type ExceptionConflict,
} from "@/app/(admin)/(dashboard)/dostupnost/actions";
import {
    diffDayBlocks,
    resolveDayTimeSlots,
    type TimeSlot,
} from "@/lib/availability";
import type {
    AvailabilityException,
    RecurringAvailability,
} from "@/lib/generated/prisma/client";
import { Spinner } from "@/components/ui/spinner";
import {
    LEAVE_WITH_UNSAVED_CHANGES_MESSAGE,
    UnsavedChangesBar,
    useConfirmLeaveWhenDirty,
    useSavedNotice,
} from "@/components/admin/unsaved-changes-bar";

const SLIDER_STEP = 15;
// Fallback track bounds when a day has no blocks yet to derive a range
// from – widened automatically (see trackBoundsFor) to always fit whatever
// real data ends up on it.
const DEFAULT_TRACK: TimeSlot = { start: 13 * 60, end: 20 * 60 };

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

// "18. – 22. listopadu", "28. listopadu – 3. prosince", and with years
// only when the range crosses one.
function formatDateRange(from: Date, to: Date): string {
    if (differenceInCalendarDays(to, from) === 0) {
        return format(from, "d. MMMM", { locale: cs });
    }
    const sameYear = from.getFullYear() === to.getFullYear();
    const sameMonth = sameYear && from.getMonth() === to.getMonth();
    const fromPattern = sameMonth
        ? "d."
        : sameYear
          ? "d. MMMM"
          : "d. MMMM yyyy";
    const toPattern = sameYear ? "d. MMMM" : "d. MMMM yyyy";
    return `${format(from, fromPattern, { locale: cs })} – ${format(to, toPattern, { locale: cs })}`;
}

// 1 den, 2-4 dny, 5+ dní.
function formatDayCount(days: number): string {
    if (days === 1) return "1 den";
    if (days >= 2 && days <= 4) return `${days} dny`;
    return `${days} dní`;
}

function newBlockId() {
    return Math.random().toString(36).slice(2);
}

function toBlocks(slots: TimeSlot[]): Block[] {
    return slots.map((slot) => ({
        id: newBlockId(),
        start: slot.start,
        end: slot.end,
    }));
}

function toSortedSlots(blocks: Block[]): TimeSlot[] {
    return [...blocks]
        .sort((a, b) => a.start - b.start)
        .map((b) => ({ start: b.start, end: b.end }));
}

function haveSameSlots(a: TimeSlot[], b: TimeSlot[]) {
    return (
        a.length === b.length &&
        a.every((slot, i) => slot.start === b[i].start && slot.end === b[i].end)
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
    // The day as it is saved, to tell unsaved edits apart and to go back to.
    const [savedSlots, setSavedSlots] = useState<TimeSlot[]>([]);
    const [rangeMode, setRangeMode] = useState(false);
    const [range, setRange] = useState<DateRange>();
    const [error, setError] = useState<string>();
    const [conflicts, setConflicts] = useState<ExceptionConflict[] | null>(
        null
    );
    const [isPending, startTransition] = useTransition();
    const { isSavedNoticeShown, showSavedNotice } = useSavedNotice();

    const isDirty =
        !rangeMode &&
        !!date &&
        !haveSameSlots(toSortedSlots(blocks), savedSlots);
    useConfirmLeaveWhenDirty(isDirty);

    function confirmDiscardChanges() {
        return !isDirty || window.confirm(LEAVE_WITH_UNSAVED_CHANGES_MESSAGE);
    }

    const minDate = addDays(localDateToUtcMidnight(new Date()), 1);

    const exceptionsByDate = new Map<number, AvailabilityException[]>();
    for (const exception of exceptions) {
        const key = localDateToUtcMidnight(exception.date).getTime();
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
        // `d` comes straight from the Calendar's onSelect, which is local
        // midnight, not UTC midnight – reading getUTCDay() on it directly
        // shifts the weekday back a day in any timezone ahead of UTC
        // (Czech local time included). Normalize first.
        const dayOfWeek = localDateToUtcMidnight(d).getUTCDay();
        return recurring
            .filter((r) => r.dayOfWeek === dayOfWeek)
            .map((r) => ({ start: r.startTime, end: r.endTime }));
    }

    function updateDate(d: Date | undefined) {
        if (!confirmDiscardChanges()) return;
        setDate(d);
        setConflicts(null);
        setError(undefined);

        if (!d) {
            setBlocks([]);
            setSavedSlots([]);
            return;
        }

        const existing =
            exceptionsByDate.get(localDateToUtcMidnight(d).getTime()) ?? [];
        const resolved = resolveDayTimeSlots(
            recurringFor(d),
            existing.map((e) => ({
                type: e.type,
                start: e.startTime,
                end: e.endTime,
            }))
        );
        setBlocks(toBlocks(resolved));
        setSavedSlots(resolved);
    }

    function discardChanges() {
        setBlocks(toBlocks(savedSlots));
        setError(undefined);
        setConflicts(null);
    }

    function toggleRangeMode() {
        if (!confirmDiscardChanges()) return;
        setRangeMode((prev) => !prev);
        setDate(undefined);
        setBlocks([]);
        setSavedSlots([]);
        setRange(undefined);
        setError(undefined);
        setConflicts(null);
    }

    function updateRange(r: DateRange | undefined) {
        setRange(r);
        setConflicts(null);
        setError(undefined);
    }

    function submitRange() {
        if (!range?.from || !range?.to) {
            setError("Vyber celý rozsah dní.");
            return;
        }
        setError(undefined);

        const startDate = format(range.from, "yyyy-MM-dd");
        const endDate = format(range.to, "yyyy-MM-dd");

        startTransition(async () => {
            if (conflicts === null) {
                const found = await checkRangeConflicts(startDate, endDate);
                if (found.length > 0) {
                    setConflicts(found);
                    return;
                }
            }

            const result = await saveCloseRange({ startDate, endDate });
            if (!result.ok) {
                setError(result.error);
                return;
            }
            setRange(undefined);
            setConflicts(null);
        });
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

    // Typing an exact time bypasses the slider's own min-gap enforcement,
    // so clamp here to keep start < end by at least one step.
    function typeStart(block: Block, value: string) {
        if (!value) return;
        const start = parseTime(roundToQuarterHour(value));
        updateBlock(
            block.id,
            Math.min(start, block.end - SLIDER_STEP),
            block.end
        );
    }

    function typeEnd(block: Block, value: string) {
        if (!value) return;
        const end = parseTime(roundToQuarterHour(value));
        updateBlock(
            block.id,
            block.start,
            Math.max(end, block.start + SLIDER_STEP)
        );
    }

    function addBlock() {
        setConflicts(null);
        if (blocks.length === 0) {
            // Nothing open yet on this day – the recurring schedule (if
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

        const target = toSortedSlots(blocks);

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

                const found = await checkDayOverrideConflicts(dateStr, blocked);
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
            setSavedSlots(target);
            setConflicts(null);
            showSavedNotice();
        });
    }

    const bounds = trackBoundsFor(date ? recurringFor(date) : [], blocks);
    const isSingleDayRange =
        !!range?.from &&
        !!range?.to &&
        differenceInCalendarDays(range.to, range.from) === 0;

    return (
        <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-6">
                <div className="flex flex-col gap-2">
                    {rangeMode ? (
                        <Calendar
                            mode="range"
                            locale={cs}
                            selected={range}
                            onSelect={updateRange}
                            // Same muted-pink band as the calendar picker's
                            // highlighted week, instead of the default grey.
                            // A one-day range has nothing to span, so no band.
                            classNames={{
                                range_start: isSingleDayRange
                                    ? ""
                                    : "relative isolate z-0 rounded-l-(--cell-radius) bg-primary/10 after:absolute after:inset-y-0 after:right-0 after:w-4 after:bg-primary/10 last:rounded-r-(--cell-radius) last:after:hidden",
                                range_middle:
                                    "rounded-none bg-primary/10 first:rounded-l-(--cell-radius) last:rounded-r-(--cell-radius)",
                                range_end: isSingleDayRange
                                    ? ""
                                    : "relative isolate z-0 rounded-r-(--cell-radius) bg-primary/10 after:absolute after:inset-y-0 after:left-0 after:w-4 after:bg-primary/10 first:rounded-l-(--cell-radius) first:after:hidden",
                                day_button:
                                    "data-[range-middle=true]:bg-transparent",
                            }}
                            disabled={(day) =>
                                localDateToUtcMidnight(day).getTime() <
                                minDate.getTime()
                            }
                            modifiers={modifiers}
                            components={{ DayButton: ExceptionDayButton }}
                            className="w-full bg-transparent"
                            fixedWeeks
                        />
                    ) : (
                        <Calendar
                            mode="single"
                            locale={cs}
                            selected={date}
                            onSelect={updateDate}
                            disabled={(day) =>
                                localDateToUtcMidnight(day).getTime() <
                                minDate.getTime()
                            }
                            modifiers={modifiers}
                            components={{ DayButton: ExceptionDayButton }}
                            className="w-full bg-transparent"
                            fixedWeeks
                        />
                    )}
                    <ExceptionLegend />
                </div>

                <div className="flex h-full flex-col gap-3">
                    {/* Always shows which mode is on - the old single
                        toggle button's label named the other one. */}
                    <div className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
                        {[
                            { range: false, label: "Jeden den" },
                            { range: true, label: "Zavřít rozsah" },
                        ].map((option) => (
                            <Button
                                key={option.label}
                                type="button"
                                variant="ghost"
                                aria-pressed={rangeMode === option.range}
                                className={
                                    rangeMode === option.range
                                        ? "bg-background shadow-sm hover:bg-background"
                                        : "text-muted-foreground"
                                }
                                onClick={() =>
                                    rangeMode !== option.range &&
                                    toggleRangeMode()
                                }
                            >
                                {option.label}
                            </Button>
                        ))}
                    </div>
                    {(rangeMode ? !range?.from || !range?.to : !date) && (
                        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center text-sm text-muted-foreground">
                            <CalendarDays className="size-8" />
                            {rangeMode
                                ? "Vyber rozsah v kalendáři."
                                : "Vyber datum v kalendáři."}
                        </div>
                    )}

                    {rangeMode ? (
                        !range?.from || !range?.to ? null : (
                            <>
                                <div>
                                    <p className="text-base font-medium">
                                        {formatDateRange(range.from, range.to)}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Zavřeno bude{" "}
                                        {formatDayCount(
                                            differenceInCalendarDays(
                                                range.to,
                                                range.from
                                            ) + 1
                                        )}
                                    </p>
                                </div>

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
                                            V tomto rozsahu{" "}
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
                                            Rezervace je potřeba zrušit nebo
                                            přesunout ručně.
                                        </AlertDescription>
                                    </Alert>
                                )}

                                <Button
                                    type="button"
                                    disabled={isPending}
                                    onClick={submitRange}
                                >
                                    {isPending ? (
                                        <Spinner className="size-4" />
                                    ) : (
                                        <CalendarX className="size-4" />
                                    )}
                                    {isPending
                                        ? "Zavírám…"
                                        : `Zavřít ${formatDayCount(
                                              differenceInCalendarDays(
                                                  range.to,
                                                  range.from
                                              ) + 1
                                          )}`}
                                </Button>
                            </>
                        )
                    ) : !date ? null : (
                        <>
                            <div>
                                <p className="text-base font-medium first-letter:uppercase">
                                    {format(date, "EEEE d. MMMM", {
                                        locale: cs,
                                    })}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {exceptionsByDate.has(
                                        localDateToUtcMidnight(date).getTime()
                                    )
                                        ? "Upraveno pro tento den"
                                        : "Podle stálé dostupnosti"}
                                </p>
                            </div>

                            {blocks.length === 0 && (
                                <p className="text-sm text-muted-foreground">
                                    Tento den je zavřeno.
                                </p>
                            )}

                            <div className="flex flex-col gap-3">
                                {blocks.map((block) => (
                                    <div
                                        key={block.id}
                                        className="flex items-center gap-2"
                                    >
                                        <div className="flex-1 rounded-2xl border p-3">
                                            <Slider
                                                value={[block.start, block.end]}
                                                onValueChange={([start, end]) =>
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
                                            <div className="mt-3 flex justify-between gap-2">
                                                <TimePicker
                                                    commitDelay={
                                                        TIME_PICKER_COMMIT_DELAY_MS
                                                    }
                                                    step={SLIDER_STEP}
                                                    icon={null}
                                                    variant="ghost"
                                                    max={formatTime(
                                                        block.end - SLIDER_STEP
                                                    )}
                                                    value={formatTime(
                                                        block.start
                                                    )}
                                                    onChange={(value) =>
                                                        typeStart(block, value)
                                                    }
                                                />
                                                <TimePicker
                                                    commitDelay={
                                                        TIME_PICKER_COMMIT_DELAY_MS
                                                    }
                                                    step={SLIDER_STEP}
                                                    icon={null}
                                                    variant="ghost"
                                                    className="text-right"
                                                    min={formatTime(
                                                        block.start +
                                                            SLIDER_STEP
                                                    )}
                                                    value={formatTime(
                                                        block.end
                                                    )}
                                                    onChange={(value) =>
                                                        typeEnd(block, value)
                                                    }
                                                />
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
                                variant="ghost"
                                onClick={addBlock}
                            >
                                <Plus className="size-4" />
                                Přidat časový blok
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
                                        {conflicts.length > 1 ? "jsou" : "je"}{" "}
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
                        </>
                    )}
                </div>
            </div>
            {!rangeMode && (
                <UnsavedChangesBar
                    isDirty={isDirty}
                    isSaving={isPending}
                    isSavedNoticeShown={isSavedNoticeShown}
                    onDiscard={discardChanges}
                    onSave={submit}
                />
            )}
        </div>
    );
}
