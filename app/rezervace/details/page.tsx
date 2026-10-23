import { redirect } from "next/navigation";
import { submitBooking, submitGroupBooking } from "@/app/rezervace/actions.ts";
import { prisma } from "@/lib/prisma.ts";
import { SoloBookingForm } from "@/components/rezervace/solo-booking-form.tsx";
import { GroupBookingForm } from "@/components/rezervace/group-booking-form.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { AlertCircle, UsersRound, CalendarDays, Clock } from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { formatTime } from "@/lib/utils.ts";
import { sumServiceDurations } from "@/lib/service-duration.ts";
import { MAX_UPCOMING_ONLINE_BOOKINGS } from "@/lib/online-booking-limit.ts";
import { BUSINESS_INFO } from "@/lib/business-info.ts";

// Set by submitBooking/submitGroupBooking (see detailsErrorUrl).
const SUBMIT_ERRORS: Record<string, { title: string; description: string }> = {
    verification: {
        title: "Ověření se nezdařilo",
        description: "Nepodařilo se ověřit, že rezervaci odesílá člověk. Zkuste ji prosím odeslat znovu.",
    },
    booking_limit: {
        title: "Příliš mnoho rezervací",
        description: `Na tento telefon nebo e-mail už jsou vytvořené ${MAX_UPCOMING_ONLINE_BOOKINGS} nadcházející rezervace. Pro další termín nám prosím zavolejte na ${BUSINESS_INFO.phoneDisplay}.`,
    },
};


export default async function DetailsPage({ searchParams }: {
    searchParams: Promise<{
        date?: string;
        services?: string;
        slot?: string;
        extraMinutes?: string;
        error?: string;
    }>;
}) {
    const { date, services, slot, extraMinutes, error } = await searchParams;
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

    const totalDuration = sumServiceDurations(serviceIds, availableServices);
    const dateSummary = format(new Date(date), "d. MMMM yyyy", { locale: cs });
    const timeSummary = `${formatTime(Number(slot))} – ${formatTime(Number(slot) + totalDuration + knownExtraMinutes)}`;

    return (
        <div className="max-w-md mx-auto">
            {error && SUBMIT_ERRORS[error] && (
                <Alert
                    variant="warning"
                    className="mb-4"
                >
                    <AlertCircle />
                    <AlertTitle>{SUBMIT_ERRORS[error].title}</AlertTitle>
                    <AlertDescription>{SUBMIT_ERRORS[error].description}</AlertDescription>
                </Alert>
            )}
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
