import { prisma } from "@/lib/prisma.ts";
import { Service } from "@/lib/generated/prisma/client";
import { StepIndicator } from "@/components/step-indicator.tsx";
import { ReservationWizard } from "@/components/reservation-wizard.tsx";

export default async function ReservationPage() {
    const availableServices: Service[] = await prisma.service.findMany({
        where: { active: true },
    });

    return (
        <div className="max-w-md mx-auto">
            <StepIndicator currentStep={1} />

            <ReservationWizard services={availableServices} />
        </div>
    );
}
