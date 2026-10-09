import type { ComponentProps } from "react";
import type { DayButton } from "react-day-picker";
import { CalendarDayButton } from "@/components/ui/calendar.tsx";
import { ExceptionDot } from "@/components/admin/exception-dot.tsx";

// Shared Calendar DayButton override: renders the same blocked/extra-open
// dot as the dostupnost exceptions tab, driven by DayPicker `modifiers`
// (blockedFull/blockedPartial/extraOpen date arrays).
export function ExceptionDayButton({
    modifiers,
    children,
    ...props
}: ComponentProps<typeof DayButton>) {
    return (
        <CalendarDayButton
            modifiers={modifiers}
            {...props}
        >
            {children}
            <ExceptionDot
                blockedFull={!!modifiers.blockedFull}
                blockedPartial={!!modifiers.blockedPartial}
                extraOpen={!!modifiers.extraOpen}
            />
        </CalendarDayButton>
    );
}
