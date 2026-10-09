import { Skeleton } from "@/components/ui/skeleton.tsx";

// Shared by kalendar/loading.tsx (first render of the route) and by
// CalendarBody (switching date within the route, where Next.js never
// re-triggers loading.tsx because the route itself doesn't change).

// Mirrors DayTimeline's grid at a plausible 4-hour day, so the placeholder has
// the same shape as whatever ends up replacing it.
const PX_PER_MIN = 2.25;
const HOURS = 4;
const HOUR_PX = 60 * PX_PER_MIN;
const GRID_PX = HOURS * HOUR_PX;

// Start/length in minutes from the top of the grid. Deliberately uneven
// lengths with gaps between them — a real day is never a solid block.
const DAY_CARDS = [
    { top: 30, height: 45 },
    { top: 90, height: 60 },
    { top: 165, height: 45 },
];

export function CalendarBodySkeleton() {
    return (
        <>
            <div className="mx-auto w-full max-w-lg md:hidden">
                <div className="mb-16 flex px-4 py-3">
                    <div
                        className="relative w-12 shrink-0"
                        style={{ height: GRID_PX }}
                    >
                        {Array.from({ length: HOURS + 1 }).map((_, i) => (
                            <Skeleton
                                key={i}
                                className="absolute h-3 w-8"
                                style={{ top: i * HOUR_PX - 6 }}
                            />
                        ))}
                    </div>

                    <div
                        className="relative flex-1 border-x"
                        style={{ height: GRID_PX }}
                    >
                        {Array.from({ length: HOURS + 1 }).map((_, i) => (
                            <div
                                key={i}
                                className="absolute inset-x-0 border-t"
                                style={{ top: i * HOUR_PX }}
                            />
                        ))}
                        {DAY_CARDS.map((c) => (
                            <Skeleton
                                key={c.top}
                                className="absolute inset-x-1 rounded-md"
                                style={{
                                    top: c.top * PX_PER_MIN,
                                    height: c.height * PX_PER_MIN,
                                }}
                            />
                        ))}
                    </div>
                </div>
            </div>

            <div className="hidden min-h-0 flex-1 gap-px p-3 md:flex">
                <Skeleton className="w-12 shrink-0 rounded-none" />
                {Array.from({ length: 5 }).map((_, i) => (
                    <div
                        key={i}
                        className="flex min-w-48 flex-1 flex-col gap-2"
                    >
                        <Skeleton className="mx-auto h-5 w-16" />
                        <Skeleton className="flex-1 rounded-none" />
                    </div>
                ))}
            </div>
        </>
    );
}
