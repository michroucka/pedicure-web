import { Suspense } from "react";
import { prisma } from "@/lib/prisma.ts";
import { Service } from "@/lib/generated/prisma/client";
import { StepIndicator } from "@/components/rezervace/step-indicator.tsx";
import { ReservationWizard } from "@/components/rezervace/reservation-wizard.tsx";

export default async function ReservationPage() {
    const availableServices: Service[] = await prisma.service.findMany({
        where: { active: true },
        orderBy: { id: "asc" },
    });

    return (
        <div className="max-w-md mx-auto">
            <StepIndicator currentStep={1} />

            <Suspense>
                <ReservationWizard services={availableServices} />
            </Suspense>
        </div>
    );
}
