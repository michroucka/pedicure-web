"use client";

import { useState, useTransition, type ComponentProps } from "react";
import { format, addDays } from "date-fns";
import { cs } from "date-fns/locale";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import {
    AlertCircle,
    CalendarOff,
    Clock,
    CalendarPlus,
    Trash2,
} from "lucide-react";
import {
    cn,
    toUtcMidnight,
    roundToQuarterHour,
    parseTime,
    formatTime,
} from "@/lib/utils.ts";
import {
    createException,
    deleteException,
    checkExceptionConflicts,
    type ExceptionConflict,
} from "@/app/(admin)/(dashboard)/dostupnost/actions.ts";
import type { AvailabilityException } from "@/lib/generated/prisma/client";
import type { DayButton } from "react-day-picker";

type Kind = "BLOCKED_ALL_DAY" | "BLOCKED_PARTIAL" | "EXTRA_OPEN";

const KIND_OPTIONS: { kind: Kind; label: string; icon: typeof CalendarOff }[] =
    [
        { kind: "BLOCKED_ALL_DAY", label: "Celý den", icon: CalendarOff },
        { kind: "BLOCKED_PARTIAL", label: "Část dne", icon: Clock },
        { kind: "EXTRA_OPEN", label: "Navíc", icon: CalendarPlus },
    ];

function exceptionLabel(exception: AvailabilityException) {
    if (exception.type === "EXTRA_OPEN") {
        return `Otevřeno navíc: ${formatTime(exception.startTime!)} – ${formatTime(exception.endTime!)}`;
    }
    if (exception.startTime === null) {
        return "Zavřeno celý den";
    }
    return `Zavřeno: ${formatTime(exception.startTime)}–${formatTime(exception.endTime!)}`;
}

function exceptionColorClass(exception: AvailabilityException) {
    if (exception.type === "EXTRA_OPEN") return "bg-success-foreground";
    if (exception.startTime === null) return "bg-danger-foreground";
    return "bg-warning-foreground";
}

function ExceptionDayButton({
    modifiers,
    children,
    ...props
}: ComponentProps<typeof DayButton>) {
    const isSplit =
        !modifiers.blockedFull && modifiers.blockedPartial && modifiers.extraOpen;

    const dotClassName = modifiers.blockedFull
        ? "bg-danger-foreground"
        : isSplit
          ? undefined
          : modifiers.blockedPartial
            ? "bg-warning-foreground"
            : modifiers.extraOpen
              ? "bg-success-foreground"
              : undefined;

    const showDot = dotClassName !== undefined || isSplit;

    return (
        <CalendarDayButton
            modifiers={modifiers}
            {...props}
        >
            {children}
            {showDot && (
                <span
                    className={cn(
                        "size-2 rounded-full ring-1 ring-background",
                        dotClassName
                    )}
                    style={
                        isSplit
                            ? {
                                  background:
                                      "linear-gradient(-45deg, var(--warning-foreground) 50%, var(--success-foreground) 50%)",
                              }
                            : undefined
                    }
                />
            )}
        </CalendarDayButton>
    );
}

export function ExceptionForm({
    exceptions,
}: {
    exceptions: AvailabilityException[];
}) {
    const [date, setDate] = useState<Date>();
    const [kind, setKind] = useState<Kind>("BLOCKED_ALL_DAY");
    const [startTime, setStartTime] = useState("09:00");
    const [endTime, setEndTime] = useState("17:00");
    const [error, setError] = useState<string>();
    const [conflicts, setConflicts] = useState<ExceptionConflict[] | null>(
        null
    );
    const [isPending, startTransition] = useTransition();
    const [isDeleting, startDeleteTransition] = useTransition();

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

    const existingForDate = date
        ? [...(exceptionsByDate.get(toUtcMidnight(date).getTime()) ?? [])].sort(
              (a, b) => (a.startTime ?? -1) - (b.startTime ?? -1)
          )
        : [];

    function updateDate(d: Date | undefined) {
        setDate(d);
        setConflicts(null);
    }

    function updateKind(k: Kind) {
        setKind(k);
        setConflicts(null);
    }

    function updateStartTime(v: string) {
        setStartTime(v);
        setConflicts(null);
    }

    function updateEndTime(v: string) {
        setEndTime(v);
        setConflicts(null);
    }

    function submit() {
        if (!date) {
            setError("Vyberte datum.");
            return;
        }
        if (kind !== "BLOCKED_ALL_DAY" && startTime >= endTime) {
            setError("Konec musí být po začátku.");
            return;
        }
        setError(undefined);

        const payload =
            kind === "BLOCKED_ALL_DAY"
                ? { kind, date: format(date, "yyyy-MM-dd") }
                : {
                      kind,
                      date: format(date, "yyyy-MM-dd"),
                      startTime,
                      endTime,
                  };

        startTransition(async () => {
            if (conflicts === null && kind !== "EXTRA_OPEN") {
                const found = await checkExceptionConflicts(
                    payload.date,
                    kind === "BLOCKED_ALL_DAY" ? null : parseTime(startTime),
                    kind === "BLOCKED_ALL_DAY" ? null : parseTime(endTime)
                );
                if (found.length > 0) {
                    setConflicts(found);
                    return;
                }
            }

            await createException(payload);
            setDate(undefined);
            setConflicts(null);
        });
    }

    return (
        <div className="flex flex-col gap-3">
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

            {date && (
                <>
                    {existingForDate.length > 0 && (
                        <div className="flex flex-col gap-2 mb-4">
                            {existingForDate.map((exception) => (
                                <div
                                    key={exception.id}
                                    className="flex items-center gap-2 px-3"
                                >
                                    <span
                                        className={cn(
                                            "h-6 w-1 shrink-0 rounded-full",
                                            exceptionColorClass(exception)
                                        )}
                                    />
                                    <span className="flex-1 text-sm">
                                        {exceptionLabel(exception)}
                                    </span>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        disabled={isDeleting}
                                        onClick={() =>
                                            startDeleteTransition(async () => {
                                                await deleteException(
                                                    exception.id
                                                );
                                            })
                                        }
                                    >
                                        <Trash2 className="size-4 text-destructive" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="grid grid-cols-3 gap-2">
                        {KIND_OPTIONS.map(({ kind: k, label, icon: Icon }) => (
                            <Button
                                key={k}
                                type="button"
                                size="lg"
                                variant={kind === k ? "default" : "outline"}
                                onClick={() => updateKind(k)}
                            >
                                <Icon className="size-4" />
                                {label}
                            </Button>
                        ))}
                    </div>

                    {kind !== "BLOCKED_ALL_DAY" && (
                        <div className="flex items-center gap-2">
                            <Input
                                type="time"
                                step="900"
                                lang="cs"
                                className="w-auto"
                                value={startTime}
                                onChange={(e) =>
                                    updateStartTime(e.target.value)
                                }
                                onBlur={(e) =>
                                    updateStartTime(
                                        roundToQuarterHour(e.target.value)
                                    )
                                }
                            />
                            <span className="text-muted-foreground">–</span>
                            <Input
                                type="time"
                                step="900"
                                lang="cs"
                                className="w-auto"
                                value={endTime}
                                onChange={(e) => updateEndTime(e.target.value)}
                                onBlur={(e) =>
                                    updateEndTime(
                                        roundToQuarterHour(e.target.value)
                                    )
                                }
                            />
                        </div>
                    )}

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
                                {conflicts.length > 1 ? "jsou" : "je"} rezervace
                            </AlertTitle>
                            <AlertDescription>
                                {conflicts.map((c, i) => (
                                    <div key={i}>
                                        {c.clientName} •{" "}
                                        {formatTime(c.startTime)}–
                                        {formatTime(c.endTime)}
                                    </div>
                                ))}
                                Rezervaci je potřeba zrušit nebo přesunout
                                ručně.
                            </AlertDescription>
                        </Alert>
                    )}

                    <Button
                        type="button"
                        size="lg"
                        disabled={isPending}
                        onClick={submit}
                    >
                        {isPending
                            ? "Ukládám…"
                            : conflicts && conflicts.length > 0
                              ? "Přesto uložit"
                              : "Přidat výjimku"}
                    </Button>
                </>
            )}
        </div>
    );
}
