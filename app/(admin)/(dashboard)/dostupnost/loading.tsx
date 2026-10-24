import { Skeleton } from "@/components/ui/skeleton.tsx";

export default function AvailabilityLoading() {
    return (
        <div className="mx-auto flex max-w-lg flex-col items-center p-4 lg:max-w-3xl">
            <Skeleton className="mb-4 h-11 w-full max-w-md rounded-2xl" />

            <div className="w-full rounded-xl border">
                <div className="flex flex-col gap-3 p-4 lg:grid lg:grid-cols-2 lg:gap-6">
                    <Skeleton className="h-64 w-full rounded-md" />
                    <div className="flex flex-col gap-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton
                                key={i}
                                className="h-16 w-full rounded-2xl"
                            />
                        ))}
                        <Skeleton className="h-9 w-32 rounded-md" />
                    </div>
                </div>
            </div>
        </div>
    );
}
