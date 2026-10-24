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
import {
    dateStrSchema,
    serviceIdsSchema,
    startTimeSchema,
} from "@/lib/validation.ts";
import { normalizeExtraMinutes } from "@/lib/extra-time.ts";
import { MAX_UPCOMING_ONLINE_BOOKINGS } from "@/lib/online-booking-limit.ts";
import { BUSINESS_INFO } from "@/lib/business-info.ts";
import { parseServiceIdsParam } from "@/lib/booking-url.ts";

// Set by submitBooking/submitGroupBooking (see detailsErrorUrl).
const SUBMIT_ERRORS: Record<string, { title: string; description: string }> = {
    verification: {
        title: "Ověření se nezdařilo",
        description:
            "Nepodařilo se ověřit, že rezervaci odesílá člověk. Zkuste ji prosím odeslat znovu.",
    },
    booking_limit: {
        title: "Příliš mnoho rezervací",
        description: `Na tento telefon nebo e-mail už jsou vytvořené ${MAX_UPCOMING_ONLINE_BOOKINGS} nadcházející rezervace. Pro další termín nám prosím zavolejte na ${BUSINESS_INFO.phoneDisplay}.`,
    },
};

export default async function DetailsPage({
    searchParams,
}: {
    searchParams: Promise<{
        date?: string;
        services?: string;
        slot?: string;
        extraMinutes?: string;
        error?: string;
    }>;
}) {
    const { date, services, slot, extraMinutes, error } = await searchParams;

    // Everything here comes from the URL - a hand-edited or stale link goes
    // back to the start of the wizard instead of crashing on Invalid Date/NaN.
    const parsedDate = dateStrSchema.safeParse(date);
    const parsedServiceIds = serviceIdsSchema.safeParse(
        parseServiceIdsParam(services)
    );
    const parsedSlot = startTimeSchema.safeParse(slot ? Number(slot) : NaN);
    if (
        !parsedDate.success ||
        !parsedServiceIds.success ||
        !parsedSlot.success
    ) {
        redirect("/rezervace");
    }
    const serviceIds = parsedServiceIds.data;
    const startTime = parsedSlot.data;
    const bookingDate = new Date(parsedDate.data);
    const knownExtraMinutes = normalizeExtraMinutes(Number(extraMinutes ?? 0));

    const availableServices = await prisma.service.findMany({
        where: { id: { in: serviceIds }, active: true },
    });
    if (availableServices.length !== new Set(serviceIds).size) {
        redirect("/rezervace");
    }

    const serviceNames = serviceIds.map(
        (id) => availableServices.find((s) => s.id === id)?.name ?? ""
    );

    const backHref = `/rezervace?date=${date}&services=${services}&slot=${slot}`;

    const totalDuration = sumServiceDurations(serviceIds, availableServices);
    const dateSummary = format(bookingDate, "d. MMMM yyyy", { locale: cs });
    const timeSummary = `${formatTime(startTime)} – ${formatTime(startTime + totalDuration + knownExtraMinutes)}`;

    return (
        <div className="mx-auto max-w-md">
            {error && Object.hasOwn(SUBMIT_ERRORS, error) && (
                <Alert
                    variant="warning"
                    className="mb-4"
                >
                    <AlertCircle />
                    <AlertTitle>{SUBMIT_ERRORS[error].title}</AlertTitle>
                    <AlertDescription>
                        {SUBMIT_ERRORS[error].description}
                    </AlertDescription>
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
                        date: bookingDate,
                        serviceId: serviceIds[0],
                        startTime: startTime,
                    })}
                    backHref={backHref}
                    startTime={startTime}
                    durationMinutes={totalDuration}
                    initialExtraMinutes={knownExtraMinutes}
                />
            ) : (
                <GroupBookingForm
                    boundSubmitAction={submitGroupBooking.bind(null, {
                        date: bookingDate,
                        serviceIds,
                        startTime: startTime,
                    })}
                    serviceNames={serviceNames}
                    backHref={backHref}
                    startTime={startTime}
                    durationMinutes={totalDuration}
                    initialExtraMinutes={knownExtraMinutes}
                />
            )}
        </div>
    );
}
