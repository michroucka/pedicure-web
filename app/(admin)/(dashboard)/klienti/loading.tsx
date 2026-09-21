import { Skeleton } from "@/components/ui/skeleton.tsx";


export default function ClientsLoading() {
    return (
        <div className="mx-auto w-full max-w-lg">
            <h2 className="px-4 pt-4 text-center">Klienti</h2>
            <div className="flex flex-col gap-3 p-4">
            <div className="divide-y overflow-hidden rounded-md border">
                {Array.from({ length: 8 }).map((_, i) => (
                    <div className="flex items-center justify-between gap-2 px-3 py-2" key={i}>
                        <Skeleton className="h-4 w-36" />
                        <Skeleton className="h-4 w-24" />
                    </div>
                ))}
            </div>
            </div>
        </div>
    );
}