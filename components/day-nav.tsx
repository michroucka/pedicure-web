"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { format, addDays } from "date-fns";
import { cs } from "date-fns/locale";
import { Button } from "@/components/ui/button.tsx";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover.tsx";
import { Calendar } from "@/components/ui/calendar.tsx";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toUtcMidnight } from "@/lib/utils.ts";

export function DayNav({ date }: { date: Date }) {
    const router = useRouter();
    const pathname = usePathname();
    const [open, setOpen] = useState(false);

    function goTo(d: Date) {
        router.push(`${pathname}?date=${format(d, "yyyy-MM-dd")}`);
    }

    const isToday = date.getTime() === toUtcMidnight(new Date()).getTime();

    return (
        <div className="flex items-center justify-between gap-2 px-4 py-2">
            <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => goTo(addDays(date, -1))}
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
                        <span className="text-xs text-muted-foreground">
                            {isToday
                                ? "Dnes"
                                : format(date, "EEEE", { locale: cs })}
                        </span>
                        <span className="font-semibold">
                            {format(date, "d. MMMM yyyy", { locale: cs })}
                        </span>
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
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
                onClick={() => goTo(addDays(date, 1))}
            >
                <ChevronRight className="size-4" />
            </Button>
        </div>
    );
}
