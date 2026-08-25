"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Calendar } from "@/components/ui/calendar";
import { useEffect, useRef, useState, useTransition } from "react";
import {
    format,
    startOfMonth,
    startOfWeek,
    addDays,
    max as maxDate,
    startOfDay,
} from "date-fns";
import { cs } from "date-fns/locale";
import { cn, toUtcMidnight } from "@/lib/utils";
import { getAvailableDaysAction } from "@/app/rezervace/actions.ts";
import { Spinner } from "@/components/ui/spinner.tsx";

// Fetched once per service selection instead of once per visible month —
// browsing a few months back/forth then costs zero extra round-trips.
// Only a month outside this window (rare — see the second effect below)
// needs its own fetch.
const HORIZON_DAYS = 120;

export function DateStep({ onContinueAction }: { onContinueAction: () => void }) {
    const [currentMonth, setCurrentMonth] = useState<Date>(
        new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    );
    const [availableDays, setAvailableDays] = useState<Date[]>([]);
    const [horizon, setHorizon] = useState<{ from: number; to: number }>();
    const [isLoading, startTransition] = useTransition();
    const hasAutoJumped = useRef(false);

    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const dateParam = searchParams.get("date");
    const date = dateParam ? new Date(dateParam) : undefined;

    const tomorrow = toUtcMidnight(addDays(startOfDay(new Date()), 1));
    const horizonEnd = addDays(tomorrow, HORIZON_DAYS);

    const gridStart = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
    const gridEnd = toUtcMidnight(addDays(gridStart, 41));
    const rangeFrom = toUtcMidnight(maxDate([gridStart, tomorrow]));

    const currentServices: number[] =
        searchParams.get("services")?.split(",").filter(Boolean).map(Number) ?? [];

    // Fetch the whole horizon once whenever the chosen services change.
    useEffect(() => {
        hasAutoJumped.current = false;
        startTransition(async () => {
            const days = await getAvailableDaysAction(
                { from: tomorrow, to: horizonEnd },
                currentServices
            );
            setAvailableDays(days);
            setHorizon({ from: tomorrow.getTime(), to: horizonEnd.getTime() });

            // If the month we're showing has nothing free, jump straight to
            // the month of the first free day in the horizon — otherwise the
            // calendar just looks fully booked. Skipped once a date's already
            // picked (e.g. coming back from a later step), so it doesn't yank
            // the user away from their selection.
            if (!dateParam && days.length > 0) {
                const firstAvailable = days.reduce((min, d) => (d < min ? d : min));
                const firstMonth = startOfMonth(firstAvailable).getTime();
                if (firstMonth !== startOfMonth(currentMonth).getTime()) {
                    hasAutoJumped.current = true;
                    setCurrentMonth(startOfMonth(firstAvailable));
                }
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams.get("services")]);

    // Fallback for browsing past the pre-fetched horizon (rare) — fetch
    // just that month and merge it in, keeping the horizon data we already
    // have instead of throwing it away.
    useEffect(() => {
        if (!horizon) return;
        if (gridStart.getTime() >= horizon.from && gridEnd.getTime() <= horizon.to) {
            return;
        }

        startTransition(async () => {
            const days = await getAvailableDaysAction(
                { from: rangeFrom, to: gridEnd },
                currentServices
            );
            setAvailableDays((prev) => {
                const seen = new Set(prev.map((d) => d.getTime()));
                return [...prev, ...days.filter((d) => !seen.has(d.getTime()))];
            });
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentMonth, horizon]);

    const availableSet = new Set(availableDays.map((d) => d.getTime()));

    function updateParam(key: string, value: string) {
        const params = new URLSearchParams(searchParams);
        params.set(key, value);
        params.delete("slot");
        params.delete("error");
        router.push(`${pathname}?${params.toString()}`);
    }

    return (
        <div>
            {isLoading && (
                <div className="mb-2 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Spinner className="size-4" />
                    Načítání dostupných termínů…
                </div>
            )}
            <Calendar
                mode="single"
                locale={cs}
                selected={date}
                onSelect={(d) => {
                    if (!d) return;
                    updateParam("date", format(d, "yyyy-MM-dd"));
                    onContinueAction();
                }}
                disabled={(day) => !availableSet.has(toUtcMidnight(day).getTime())}
                month={currentMonth}
                onMonthChange={setCurrentMonth}
                fixedWeeks
                className={cn(
                    "w-full bg-transparent",
                    isLoading && "pointer-events-none opacity-50"
                )}
                required
            />
        </div>
    );
}
