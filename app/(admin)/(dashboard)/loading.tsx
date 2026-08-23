import { Loader2 } from "lucide-react";

export default function DashboardLoading() {
    return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
            Načítání…
        </div>
    );
}
