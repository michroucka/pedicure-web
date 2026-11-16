import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
    return (
        <div className="mx-auto flex w-full max-w-lg flex-col gap-2 p-4">
            <Skeleton className="mx-4 h-3 w-16" />
            <Skeleton className="h-77 w-full rounded-2xl" />
            <Skeleton className="mx-4 mt-4 h-3 w-12" />
            <Skeleton className="h-35 w-full rounded-2xl" />
        </div>
    );
}
