import { redirect } from "next/navigation";
import { submitBooking, submitGroupBooking } from "@/app/rezervace/actions.ts";
import { prisma } from "@/lib/prisma.ts";
import { SoloBookingForm } from "@/components/rezervace/solo-booking-form.tsx";
import { GroupBookingForm } from "@/components/rezervace/group-booking-form.tsx";
import { StepIndicator } from "@/components/rezervace/step-indicator.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { UsersRound, CalendarDays, Clock } from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { formatTime } from "@/lib/utils.ts";


export default async function DetailsPage({ searchParams }: {
    searchParams: Promise<{
        date?: string;
        services?: string;
        slot?: string;
        extraMinutes?: string;
    }>;
}) {
    const { date, services, slot, extraMinutes } = await searchParams;
    const serviceIds = services?.split(",").filter(Boolean).map(Number) ?? [];
    const knownExtraMinutes = Number(extraMinutes ?? 0);

    if (!date || serviceIds.length === 0 || !slot) {
        redirect("/rezervace");
    }

    const availableServices = await prisma.service.findMany({
        where: { id: { in: serviceIds } },
    })

    const serviceNames = serviceIds.map(
        (id) => availableServices.find((s) => s.id === id)?.name ?? ""
    )

    const backHref = `/rezervace?date=${date}&services=${services}&slot=${slot}`;

    const totalDuration = availableServices.reduce(
        (sum, s) => sum + s.durationMinutes,
        0
    );
    const dateSummary = format(new Date(date), "d. MMMM yyyy", { locale: cs });
    const timeSummary = `${formatTime(Number(slot))} – ${formatTime(Number(slot) + totalDuration + knownExtraMinutes)}`;

    return (
        <div className="max-w-md mx-auto">
            <StepIndicator currentStep={2} />

            <Card className="mb-6">
                <CardContent className="flex flex-col gap-2 text-sm">
                    <div className="flex items-center gap-2">
                        <UsersRound className="size-4 text-muted-foreground" />
                        {serviceNames.join(" • ")}
                    </div>
                    <div className="flex items-center gap-2">
                        <CalendarDays className="size-4 text-muted-foreground" />
                        {dateSummary}
                    </div>
                    <div className="flex items-center gap-2">
                        <Clock className="size-4 text-muted-foreground" />
                        {timeSummary}
                    </div>
                </CardContent>
            </Card>

            {serviceIds.length === 1 ? (
                <SoloBookingForm
                    boundSubmitAction={submitBooking.bind(null, {
                        date: new Date(date),
                        serviceId: serviceIds[0],
                        startTime: Number(slot),
                    })}
                    backHref={backHref}
                    startTime={Number(slot)}
                    durationMinutes={totalDuration}
                    initialExtraMinutes={knownExtraMinutes}
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
                    startTime={Number(slot)}
                    durationMinutes={totalDuration}
                    initialExtraMinutes={knownExtraMinutes}
                />
            )}
        </div>
    );
}
