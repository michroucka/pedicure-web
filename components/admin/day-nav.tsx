"use client";

import { useState, useTransition, type ReactNode } from "react";
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
import { Spinner } from "@/components/ui/spinner.tsx";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn, toUtcMidnight } from "@/lib/utils.ts";

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
}: {
    date: Date;
    step: number;
    label: ReactNode;
    className?: string;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    function goTo(d: Date) {
        const params = new URLSearchParams({ date: format(d, "yyyy-MM-dd") });
        startTransition(() => {
            router.push(`${pathname}?${params.toString()}`);
        });
    }

    return (
        <div className={cn("px-4 py-2", className)}>
            <div className="flex items-center justify-between gap-2">
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={isPending}
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
                            disabled={isPending}
                        >
                            {isPending ? (
                                <Spinner className="size-5" />
                            ) : (
                                label
                            )}
                        </Button>
                    </PopoverTrigger>
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
                            className="bg-transparent"
                        />
                    </PopoverContent>
                </Popover>

                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={isPending}
                    onClick={() => goTo(addDays(date, step))}
                >
                    <ChevronRight className="size-4" />
                </Button>
            </div>
        </div>
    );
}

export function DayNav({
    date,
    weekStart,
    weekEnd,
}: {
    date: Date;
    weekStart: Date;
    weekEnd: Date;
}) {
    const isToday = date.getTime() === toUtcMidnight(new Date()).getTime();

    return (
        <>
            <NavBar
                date={date}
                step={1}
                className="md:hidden"
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
                label={
                    <>
                        <span className="text-xs text-muted-foreground">
                            {getISOWeek(weekStart)}. týden
                        </span>
                        <span className="font-semibold">
                            {format(weekStart, "d.")} –{" "}
                            {format(weekEnd, "d. MMMM yyyy", { locale: cs })}
                        </span>
                    </>
                }
            />
        </>
    );
}
