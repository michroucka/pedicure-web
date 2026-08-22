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
import { Loader2 } from "lucide-react";

export function DateStep({ onContinueAction }: { onContinueAction: () => void }) {
    const [currentMonth, setCurrentMonth] = useState<Date>(
        new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    );
    const [availableDays, setAvailableDays] = useState<Date[]>([]);
    const [isLoading, startTransition] = useTransition();
    const hasAutoJumped = useRef(false);

    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const dateParam = searchParams.get("date");
    const date = dateParam ? new Date(dateParam) : undefined;

    const gridStart = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
    const gridEnd = addDays(gridStart, 41);
    const rangeFrom = maxDate([gridStart, addDays(startOfDay(new Date()), 1)]);
    const currentServices: number[] =
        searchParams.get("services")?.split(",").filter(Boolean).map(Number) ?? [];

    useEffect(() => {
        startTransition(async () => {
            const days = await getAvailableDaysAction(
                { from: toUtcMidnight(rangeFrom), to: toUtcMidnight(gridEnd) },
                currentServices
            );
            setAvailableDays(days);

            // If the month we're showing has nothing free, look further ahead
            // once and jump straight to the month of the first free day —
            // otherwise the calendar just looks fully booked. Skipped once a
            // date's already picked (e.g. coming back from a later step), so
            // it doesn't yank the user away from their selection.
            if (!hasAutoJumped.current && !dateParam && days.length === 0) {
                hasAutoJumped.current = true;
                const horizonEnd = addDays(toUtcMidnight(rangeFrom), 180);
                const upcoming = await getAvailableDaysAction(
                    { from: toUtcMidnight(rangeFrom), to: horizonEnd },
                    currentServices
                );
                if (upcoming.length > 0) {
                    const firstAvailable = upcoming.reduce((min, d) =>
                        d < min ? d : min
                    );
                    setCurrentMonth(startOfMonth(firstAvailable));
                }
            } else {
                hasAutoJumped.current = true;
            }
        });
    }, [currentMonth, searchParams.get("services")]);

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
                    <Loader2 className="size-4 animate-spin" />
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