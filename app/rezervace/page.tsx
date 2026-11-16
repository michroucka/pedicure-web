import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { Service } from "@/lib/generated/prisma/client";
import { ReservationWizard } from "@/components/rezervace/reservation-wizard";
import { CzechText } from "@/components/czech-text";

export default async function ReservationPage() {
    const availableServices: Service[] = await prisma.service.findMany({
        where: { active: true },
        orderBy: { id: "asc" },
    });

    return (
        <CzechText>
            <div className="mx-auto max-w-md">
                <Suspense>
                    <ReservationWizard services={availableServices} />
                </Suspense>
            </div>
        </CzechText>
    );
}
