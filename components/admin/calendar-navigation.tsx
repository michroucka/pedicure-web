"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { format } from "date-fns";
import { CalendarBodySkeleton } from "@/components/admin/calendar-body-skeleton.tsx";

// Changing ?date= keeps us on the same route, so Next.js never re-runs
// kalendar/loading.tsx — the old day/week would stay on screen until the
// server answers. This tracks the date the user just clicked so the nav can
// render it immediately while the body swaps to a skeleton.
type CalendarNavigationValue = {
    date: Date;
    isNavigating: boolean;
    startNavigation: (target: Date) => void;
};

const CalendarNavigationContext =
    createContext<CalendarNavigationValue | null>(null);

const toParam = (d: Date) => format(d, "yyyy-MM-dd");

export function CalendarNavigationProvider({
    serverDate,
    children,
}: {
    serverDate: Date;
    children: ReactNode;
}) {
    const [pendingDate, setPendingDate] = useState<Date | null>(null);
    const serverParam = toParam(serverDate);

    // No effect resets `pendingDate` — once the server answers with that same
    // day the comparison below goes false on its own. Comparing the URL params
    // rather than the Date objects: the arrows build their target with date-fns
    // addDays, which doesn't necessarily land on the exact UTC midnight the
    // server sends back.
    const isNavigating =
        pendingDate !== null && toParam(pendingDate) !== serverParam;

    return (
        <CalendarNavigationContext.Provider
            value={{
                date: pendingDate ?? serverDate,
                isNavigating,
                startNavigation: setPendingDate,
            }}
        >
            {children}
        </CalendarNavigationContext.Provider>
    );
}

export function useCalendarNavigation() {
    const value = useContext(CalendarNavigationContext);
    if (!value) {
        throw new Error(
            "useCalendarNavigation must be used inside CalendarNavigationProvider"
        );
    }
    return value;
}

export function CalendarBody({ children }: { children: ReactNode }) {
    const { isNavigating } = useCalendarNavigation();
    return isNavigating ? <CalendarBodySkeleton /> : children;
}
