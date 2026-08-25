import { Spinner } from "@/components/ui/spinner.tsx";

export default function DashboardLoading() {
    return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
            <Spinner className="size-6" />
            Načítání…
        </div>
    );
}
