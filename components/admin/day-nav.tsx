"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { format, addDays, getISOWeek } from "date-fns";
import { cs } from "date-fns/locale";
import { Button } from "@/components/ui/button.tsx";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover.tsx";
import { Calendar } from "@/components/ui/calendar.tsx";
import {
    Calendar1,
    CalendarDays,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import { toUtcMidnight } from "@/lib/utils.ts";

export function DayNav({
    date,
    view,
    weekStart,
    weekEnd,
}: {
    date: Date;
    view: "day" | "week";
    weekStart?: Date;
    weekEnd?: Date;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [open, setOpen] = useState(false);

    // On a bare /admin visit (no params at all yet), default to Week on
    // tablet-landscape/desktop and Day on mobile — matches the same lg
    // breakpoint the Den/Týden toggle itself is gated behind.
    useEffect(() => {
        if (searchParams.size > 0) return;
        if (window.matchMedia("(min-width: 1024px)").matches) {
            router.replace(`${pathname}?view=week`);
        }
    }, [searchParams, pathname, router]);

    function goTo(d: Date, nextView: "day" | "week" = view) {
        const params = new URLSearchParams({
            date: format(d, "yyyy-MM-dd"),
            view: nextView,
        });
        router.push(`${pathname}?${params.toString()}`);
    }

    const step = view === "week" ? 7 : 1;
    const isToday = date.getTime() === toUtcMidnight(new Date()).getTime();

    return (
        <div className="px-4 py-2">
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
                    <PopoverTrigger asChild>
                        <Button
                            type="button"
                            variant="ghost"
                            className="h-auto flex-col gap-0 py-1"
                        >
                            {view === "day" ? (
                                <>
                                    <span className="text-xs text-muted-foreground">
                                        {isToday
                                            ? "Dnes"
                                            : format(date, "EEEE", {
                                                  locale: cs,
                                              })}
                                    </span>
                                    <span className="font-semibold">
                                        {format(date, "d. MMMM yyyy", {
                                            locale: cs,
                                        })}
                                    </span>
                                </>
                            ) : (
                                <>
                                    <span className="text-xs text-muted-foreground">
                                        {weekStart &&
                                            `${getISOWeek(weekStart)}. týden`}
                                    </span>
                                    <span className="font-semibold">
                                        {weekStart && format(weekStart, "d.")} –{" "}
                                        {weekEnd &&
                                            format(weekEnd, "d. MMMM yyyy", {
                                                locale: cs,
                                            })}
                                    </span>
                                </>
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="flex w-auto flex-col gap-2 p-2">
                        <div className="hidden grid-cols-2 gap-2 lg:grid">
                            <Button
                                type="button"
                                size="sm"
                                variant={view === "day" ? "default" : "outline"}
                                onClick={() => goTo(date, "day")}
                            >
                                <Calendar1 className="size-4" />
                                Den
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant={
                                    view === "week" ? "default" : "outline"
                                }
                                onClick={() => goTo(date, "week")}
                            >
                                <CalendarDays className="size-4" />
                                Týden
                            </Button>
                        </div>
                        <Calendar
                            mode="single"
                            locale={cs}
                            selected={date}
                            onSelect={(d) => {
                                if (!d) return;
                                goTo(d);
                                setOpen(false);
                            }}
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
