"use client";

import { useState, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { format, addDays, getISOWeek } from "date-fns";
import { cs } from "date-fns/locale";
import { Button } from "@/components/ui/button.tsx";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover.tsx";
import { Calendar } from "@/components/ui/calendar.tsx";
import { ExceptionDayButton } from "@/components/admin/exception-day-button.tsx";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
    cn,
    toUtcMidnight,
    startOfWeekUtc,
    addUtcDays,
} from "@/lib/utils.ts";
import { categorizeExceptions } from "@/lib/availability.ts";
import { ExceptionDot } from "@/components/admin/exception-dot.tsx";
import { useCalendarNavigation } from "@/components/admin/calendar-navigation.tsx";
import type { AvailabilityException } from "@/lib/generated/prisma/client.ts";

// No more Den/Týden toggle — which one is visible is decided purely by the
// lg breakpoint (className below), same as everywhere else this app splits
// mobile/tablet-portrait from tablet-landscape/desktop. Both nav bars (and
// both timelines in kalendar/page.tsx) render every time; CSS just hides
// one of them. That avoids the old client-side matchMedia + router.replace
// dance, which meant a visible flash from day to week on wide screens after
// hydration.
function NavBar({
    date,
    step,
    label,
    className,
    exceptionDot,
    modifiers,
}: {
    date: Date;
    step: number;
    label: ReactNode;
    className?: string;
    exceptionDot?: ReactNode;
    modifiers?: Record<string, Date[]>;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const [open, setOpen] = useState(false);
    const { startNavigation } = useCalendarNavigation();

    function goTo(d: Date) {
        const params = new URLSearchParams({ date: format(d, "yyyy-MM-dd") });
        startNavigation(d);
        router.push(`${pathname}?${params.toString()}`);
    }

    return (
        <div className={cn("px-4 py-2", className)}>
            <div className="flex items-center justify-between gap-2">
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => goTo(addDays(date, -step))}
                >
                    <ChevronLeft className="size-4" />
                </Button>

                <Popover
                    open={open}
                    onOpenChange={setOpen}
                >
                    <div className="relative overflow-visible">
                        <PopoverTrigger asChild>
                            <Button
                                type="button"
                                variant="ghost"
                                className="h-auto flex-col gap-0 py-1"
                            >
                                {label}
                            </Button>
                        </PopoverTrigger>
                        {exceptionDot && (
                            <span className="absolute top-4 -right-1 z-10 flex">
                                {exceptionDot}
                            </span>
                        )}
                    </div>
                    <PopoverContent className="w-auto p-2">
                        <Calendar
                            mode="single"
                            locale={cs}
                            selected={date}
                            defaultMonth={date}
                            onSelect={(d) => {
                                if (!d) return;
                                goTo(d);
                                setOpen(false);
                            }}
                            modifiers={modifiers}
                            components={{ DayButton: ExceptionDayButton }}
                            className="bg-transparent"
                        />
                    </PopoverContent>
                </Popover>

                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => goTo(addDays(date, step))}
                >
                    <ChevronRight className="size-4" />
                </Button>
            </div>
        </div>
    );
}

export function DayNav({
    weekStart,
    weekEnd,
    exceptions = [],
    allExceptions = [],
}: {
    weekStart: Date;
    weekEnd: Date;
    exceptions?: AvailabilityException[];
    // Broader than `exceptions` (current day only) — feeds the date picker's
    // open/closed dots across whole months, same convention as dostupnost.
    allExceptions?: AvailabilityException[];
}) {
    // `date` follows the click instantly; `weekStart`/`weekEnd`/`exceptions`
    // are still the server's, so while a navigation is in flight they belong
    // to the day we're leaving and must be recomputed or dropped.
    const { date, isNavigating } = useCalendarNavigation();

    const shownWeekStart = isNavigating
        ? startOfWeekUtc(toUtcMidnight(date))
        : weekStart;
    const shownWeekEnd = isNavigating
        ? addUtcDays(shownWeekStart, 6)
        : weekEnd;

    const isToday = toUtcMidnight(date).getTime() === toUtcMidnight(new Date()).getTime();
    const { blockedFull, blockedPartial, extraOpen } =
        categorizeExceptions(exceptions);
    const hasException =
        !isNavigating && (blockedFull || blockedPartial || extraOpen);

    const pickerModifiers = {
        blockedFull: allExceptions
            .filter((e) => e.type === "BLOCKED" && e.startTime === null)
            .map((e) => e.date),
        blockedPartial: allExceptions
            .filter((e) => e.type === "BLOCKED" && e.startTime !== null)
            .map((e) => e.date),
        extraOpen: allExceptions
            .filter((e) => e.type === "EXTRA_OPEN")
            .map((e) => e.date),
    };

    return (
        <>
            <NavBar
                date={date}
                step={1}
                className="md:hidden"
                modifiers={pickerModifiers}
                exceptionDot={
                    hasException ? (
                        <ExceptionDot
                            blockedFull={blockedFull}
                            blockedPartial={blockedPartial}
                            extraOpen={extraOpen}
                        />
                    ) : undefined
                }
                label={
                    <>
                        <span className="text-xs text-muted-foreground">
                            {isToday
                                ? "Dnes"
                                : format(date, "EEEE", { locale: cs })}
                        </span>
                        <span className="font-semibold">
                            {format(date, "d. MMMM yyyy", { locale: cs })}
                        </span>
                    </>
                }
            />
            <NavBar
                date={date}
                step={7}
                className="hidden md:block"
                modifiers={pickerModifiers}
                label={
                    <>
                        <span className="text-xs text-muted-foreground">
                            {getISOWeek(shownWeekStart)}. týden
                        </span>
                        <span className="font-semibold">
                            {format(shownWeekStart,
                                shownWeekStart.getUTCMonth() === shownWeekEnd.getUTCMonth()
                                    ? "d." : "d. MMMM", { locale: cs }
                            )} –{" "}
                            {format(shownWeekEnd, "d. MMMM yyyy", {
                                locale: cs,
                            })}
                        </span>
                    </>
                }
            />
        </>
    );
}
