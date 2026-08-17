import { redirect } from "next/navigation";
import { submitBooking, submitGroupBooking } from "@/app/reservation/actions.ts";
import { prisma } from "@/lib/prisma.ts";
import { SoloBookingForm } from "@/components/solo-booking-form.tsx";
import { GroupBookingForm } from "@/components/group-booking-form.tsx";
import { StepIndicator } from "@/components/step-indicator.tsx";


export default async function DetailsPage({ searchParams }: {
    searchParams: Promise<{
        date?: string;
        services?: string;
        slot?: string;
    }>;
}) {
    const { date, services, slot } = await searchParams;
    const serviceIds = services?.split(",").filter(Boolean).map(Number) ?? [];

    if (!date || serviceIds.length === 0 || !slot) {
        redirect("/reservation");
    }

    const availableServices = await prisma.service.findMany({
        where: { id: { in: serviceIds } },
    })

    const serviceNames = serviceIds.map(
        (id) => availableServices.find((s) => s.id === id)?.name ?? ""
    )

    const backHref = `/reservation?date=${date}&services=${services}`;

    return (
        <div className="max-w-md mx-auto">
            <StepIndicator currentStep={2} />

            {serviceIds.length === 1 ? (
                <SoloBookingForm
                    boundSubmitAction={submitBooking.bind(null, {
                        date: new Date(date),
                        serviceId: serviceIds[0],
                        startTime: Number(slot),
                    })}
                    backHref={backHref}
                />
            ) : (
                <GroupBookingForm
                    boundSubmitAction={submitGroupBooking.bind(null, {
                        date: new Date(date),
                        serviceIds,
                        startTime: Number(slot),
                    })}
                    serviceNames={serviceNames}
                    backHref={backHref}
                />
            )}
        </div>
    );
}
