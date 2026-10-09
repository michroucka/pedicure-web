import { Skeleton } from "@/components/ui/skeleton.tsx";
import { CalendarBodySkeleton } from "@/components/admin/calendar-body-skeleton.tsx";

export default function KalendarLoading() {
    return (
        <div className="flex h-full w-full flex-col">
            <div className="sticky top-0 z-10 bg-background">
                <div className="mx-auto w-full max-w-lg px-4 py-2">
                    <div className="flex items-center justify-between gap-2">
                        <Skeleton className="size-9 rounded-md" />
                        <div className="flex flex-col items-center gap-1">
                            <Skeleton className="h-3 w-16" />
                            <Skeleton className="h-5 w-36" />
                        </div>
                        <Skeleton className="size-9 rounded-md" />
                    </div>
                </div>
            </div>

            <CalendarBodySkeleton />
        </div>
    );
}
