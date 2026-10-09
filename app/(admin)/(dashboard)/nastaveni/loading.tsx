import { Skeleton } from "@/components/ui/skeleton.tsx";

export default function SettingsLoading() {
    return (
        <div className="mx-auto flex w-full max-w-lg flex-col gap-4 p-4">
            <h2 className="text-center">Nastavení</h2>
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-md" />
        </div>
    );
}
