import { Skeleton } from "@/components/ui/skeleton";

export default function ClientsLoading() {
    return (
        <div className="mx-auto w-full max-w-lg md:max-w-2xl">
            <div className="flex flex-col gap-3 px-4 pb-4">
                <div className="pb-1">
                    <Skeleton className="h-10 w-full rounded-2xl" />
                </div>
                <div className="divide-y overflow-hidden rounded-2xl border">
                    {Array.from({ length: 10 }).map((_, i) => (
                        <div
                            className="flex min-h-11 items-center gap-3 px-4 py-1.5"
                            key={i}
                        >
                            <Skeleton className="h-4 w-40" />
                            <Skeleton className="ml-auto h-4 w-24" />
                            <Skeleton className="size-4" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
