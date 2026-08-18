import { prisma } from "@/lib/prisma.ts";
import { Service } from "@/lib/generated/prisma/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { AlertCircle } from "lucide-react";
import { StepIndicator } from "@/components/step-indicator.tsx";
import { ReservationWizard } from "@/components/reservation-wizard.tsx";

export default async function ReservationPage({ searchParams }: {
    searchParams: Promise<{
        error?: string;
    }>;
}) {
    const { error } = await searchParams;

    const availableServices: Service[] = await prisma.service.findMany({
        where: { active: true },
    });

    return (
        <div className="max-w-md mx-auto">
            <StepIndicator currentStep={1} />

            <ReservationWizard services={availableServices} />

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
