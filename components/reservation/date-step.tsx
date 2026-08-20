"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Calendar } from "@/components/ui/calendar";
import { useEffect, useState } from "react";
import {
    format,
    startOfMonth,
    startOfWeek,
    addDays,
    max as maxDate,
    startOfDay,
} from "date-fns";
import { cs } from "date-fns/locale";
import { toUtcMidnight } from "@/lib/utils";
import { getAvailableDaysAction } from "@/app/reservation/actions.ts";

export function DateStep({ onContinueAction }: { onContinueAction: () => void }) {
    const [currentMonth, setCurrentMonth] = useState<Date>(
        new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    );
    const [availableDays, setAvailableDays] = useState<Date[]>([]);

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
        async function load() {
            const days = await getAvailableDaysAction(
                { from: toUtcMidnight(rangeFrom), to: toUtcMidnight(gridEnd) },
                currentServices
            );
            setAvailableDays(days);
        }
        load();
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
            className="w-full bg-transparent"
            required
        />
    );
}