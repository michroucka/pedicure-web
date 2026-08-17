import { prisma } from "@/lib/prisma.ts";
import { getAvailableSlots } from "@/lib/get-available-slots.ts";
import { Service } from "@/lib/generated/prisma/client";
import { ReservationFilters } from "@/components/reservation-filters.tsx";
import { formatTime } from "@/lib/utils.ts";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { AlertCircle } from "lucide-react";
import { StepIndicator } from "@/components/step-indicator.tsx";

export default async function ReservationPage({
    searchParams,
}: {
    searchParams: Promise<{
        date?: string;
        services?: string;
        error?: string;
    }>;
}) {
    const { date, services, error } = await searchParams;
    const serviceIds = services?.split(",").filter(Boolean).map(Number) ?? [];

    const availableServices: Service[] = await prisma.service.findMany({
        where: { active: true },
    });
    const availableSlots: number[] =
        date && serviceIds.length > 0
            ? await getAvailableSlots(new Date(date), serviceIds)
            : [];

    return (
        <div>
            <StepIndicator currentStep={1} />

            <ReservationFilters services={availableServices} />

            {availableSlots.map((s) => {
                const params = new URLSearchParams({
                    date: date!,
                    services: serviceIds.join(","),
                });
                return (
                    <Link
                        key={s}
                        href={`/reservation/details?${params.toString()}&slot=${s}`}
                        className="me-2"
                    >
                        {formatTime(s)}
                    </Link>
                );
            })}

            {error === "slot_taken" && (
                <Alert className="max-w-md border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-50">
                    <AlertCircle />
                    <AlertTitle>Termín již není volný</AlertTitle>
                    <AlertDescription>
                        Tento termín je již obsazený. Vyberte prosím jiný čas.
                    </AlertDescription>
                </Alert>
            )}
        </div>
    );
}
