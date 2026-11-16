"use client";

import { useState, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { format, addDays, getISOWeek } from "date-fns";
import { cs } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ExceptionDayButton } from "@/components/admin/exception-day-button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
    cn,
    localDateToUtcMidnight,
    startOfWeekUtc,
    addUtcDays,
} from "@/lib/utils";
import { categorizeExceptions } from "@/lib/availability";
import { ExceptionDot } from "@/components/admin/exception-dot";
import { useCalendarNavigation } from "@/components/admin/calendar-navigation";
import type { AvailabilityException } from "@/lib/generated/prisma/client";

// Popover fade-out duration (duration-100 in components/ui/popover.tsx)
// plus some slack - in practice the fade runs a bit past 100 ms.
const PICKER_CLOSE_MS = 160;

// Explains the picker's dots - same colours as ExceptionDot.
function ExceptionLegend() {
    const items = [
        { label: "Otevřeno navíc", extraOpen: true },
        { label: "Zavřeno", blockedFull: true },
        { label: "Částečně zavřeno", blockedPartial: true },
    ];
    return (
        <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 border-t px-2 pt-2 pb-1 text-xs text-muted-foreground">
            {items.map((item) => (
                <li
                    key={item.label}
                    className="flex items-center gap-1.5"
                >
                    <ExceptionDot
                        blockedFull={!!item.blockedFull}
                        blockedPartial={!!item.blockedPartial}
                        extraOpen={!!item.extraOpen}
                    />
                    {item.label}
                </li>
            ))}
        </ul>
    );
}

// No more Den/Týden toggle – which one is visible is decided purely by the
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
    // The picker's own copy of the date, taken when it opens. Picking a day
    // updates `date` at once, and the closing picker would redraw the new
    // week's highlight mid fade-out - a visible flash.
    const [pickerDate, setPickerDate] = useState(date);
    const shownWeekStart = startOfWeekUtc(localDateToUtcMidnight(pickerDate));
    const shownWeekDays = Array.from({ length: 7 }, (_, i) =>
        addUtcDays(shownWeekStart, i)
    );

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
                    aria-label={
                        step === 7 ? "Předchozí týden" : "Předchozí den"
                    }
                    onClick={() => goTo(addDays(date, -step))}
                >
                    <ChevronLeft className="size-4" />
                </Button>

                <Popover
                    open={open}
                    onOpenChange={(isOpen) => {
                        if (isOpen) setPickerDate(date);
                        setOpen(isOpen);
                    }}
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
                            // Week view highlights the whole shown week
                            // (shownWeek below) - a single selected day
                            // would misstate what's on screen.
                            selected={step === 7 ? undefined : pickerDate}
                            defaultMonth={pickerDate}
                            onSelect={(d) => {
                                if (!d) return;
                                // Close first, navigate once the fade-out is
                                // done: the navigation's re-render (calendar
                                // to skeleton, ~80 ms) would otherwise stall
                                // the animation half-way. startTransition
                                // was tried instead - it flickered in a
                                // different way.
                                setOpen(false);
                                setTimeout(() => goTo(d), PICKER_CLOSE_MS);
                            }}
                            modifiers={{
                                ...modifiers,
                                ...(step === 7 && {
                                    shownWeek: shownWeekDays,
                                    shownWeekStart: shownWeekDays[0],
                                    shownWeekEnd: shownWeekDays[6],
                                }),
                            }}
                            modifiersClassNames={{
                                shownWeek: "bg-primary/10 rounded-none!",
                                shownWeekStart: "rounded-l-(--cell-radius)!",
                                shownWeekEnd: "rounded-r-(--cell-radius)!",
                            }}
                            classNames={{
                                // The default muted text alone barely sets
                                // other months apart from this one.
                                outside: "text-muted-foreground opacity-50",
                            }}
                            components={{ DayButton: ExceptionDayButton }}
                            // ~44 px days: tapped with a finger on the tablet.
                            className="bg-transparent [--cell-size:--spacing(11)]"
                        />
                        <ExceptionLegend />
                    </PopoverContent>
                </Popover>
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label={step === 7 ? "Další týden" : "Další den"}
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
    // Broader than `exceptions` (current day only) – feeds the date picker's
    // open/closed dots across whole months, same convention as dostupnost.
    allExceptions?: AvailabilityException[];
}) {
    // `date` follows the click instantly; `weekStart`/`weekEnd`/`exceptions`
    // are still the server's, so while a navigation is in flight they belong
    // to the day we're leaving and must be recomputed or dropped.
    const { date, isNavigating } = useCalendarNavigation();

    const shownWeekStart = isNavigating
        ? startOfWeekUtc(localDateToUtcMidnight(date))
        : weekStart;
    const shownWeekEnd = isNavigating ? addUtcDays(shownWeekStart, 6) : weekEnd;

    const isToday =
        localDateToUtcMidnight(date).getTime() ===
        localDateToUtcMidnight(new Date()).getTime();
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
                            {format(
                                shownWeekStart,
                                shownWeekStart.getUTCMonth() ===
                                    shownWeekEnd.getUTCMonth()
                                    ? "d."
                                    : "d. MMMM",
                                { locale: cs }
                            )}{" "}
                            –{" "}
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
