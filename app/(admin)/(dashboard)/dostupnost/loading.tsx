import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function AvailabilityLoading() {
    return (
        <div className="mx-auto flex max-w-lg flex-col items-center p-4 lg:max-w-3xl">
            <Card className="w-full">
                <CardContent className="flex flex-col items-center gap-3">
                    <Skeleton className="mb-1 h-12 w-full max-w-md rounded-full" />
                    <div className="flex w-full flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-6">
                        <div className="flex flex-col gap-2">
                            <Skeleton className="h-95 w-full rounded-2xl" />
                            <Skeleton className="mx-auto h-5 w-4/5 rounded-full" />
                        </div>
                        <Skeleton className="h-12 w-full rounded-full" />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
