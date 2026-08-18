"use client";

import { useState, useTransition } from "react";
import { format, addDays } from "date-fns";
import { cs } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { AlertCircle, CalendarOff, Clock, CalendarPlus } from "lucide-react";
import {
    toUtcMidnight,
    roundToQuarterHour,
    parseTime,
    formatTime,
} from "@/lib/utils.ts";
import {
    createException,
    checkExceptionConflicts,
    type ExceptionConflict,
} from "@/app/admin/(dashboard)/availability/actions.ts";

type Kind = "BLOCKED_ALL_DAY" | "BLOCKED_PARTIAL" | "EXTRA_OPEN";

const KIND_OPTIONS: { kind: Kind; label: string; icon: typeof CalendarOff }[] =
    [
        { kind: "BLOCKED_ALL_DAY", label: "Celý den", icon: CalendarOff },
        { kind: "BLOCKED_PARTIAL", label: "Část dne", icon: Clock },
        { kind: "EXTRA_OPEN", label: "Navíc", icon: CalendarPlus },
    ];

export function ExceptionForm() {
    const [date, setDate] = useState<Date>();
    const [kind, setKind] = useState<Kind>("BLOCKED_ALL_DAY");
    const [startTime, setStartTime] = useState("09:00");
    const [endTime, setEndTime] = useState("17:00");
    const [error, setError] = useState<string>();
    const [conflicts, setConflicts] = useState<ExceptionConflict[] | null>(
        null
    );
    const [isPending, startTransition] = useTransition();

    const minDate = addDays(toUtcMidnight(new Date()), 1);

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
                className="w-full bg-transparent"
            />

            {date && (
                <>
                    <div className="grid grid-cols-3 gap-2">
                        {KIND_OPTIONS.map(({ kind: k, label, icon: Icon }) => (
                            <Button
                                key={k}
                                type="button"
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
                                        {c.clientName} ·{" "}
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
