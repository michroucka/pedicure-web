"use client"

import { Service } from "@/lib/generated/prisma/client.ts";
import { useState } from "react";
import { StepCard } from "@/components/rezervace/step-card.tsx";
import { PersonsStep } from "@/components/rezervace/persons-step.tsx";
import { DateStep } from "@/components/rezervace/date-step.tsx";
import { TimeSlotStep } from "@/components/rezervace/time-slot-step.tsx";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { formatTime } from "@/lib/utils.ts";
import { Button } from "@/components/ui/button.tsx";
import { Check, X } from "lucide-react";

export function ReservationWizard({ services }: { services: Service[] }) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [step, setStep] = useState(() => {
        const hasServices = !!searchParams.get("services");
        const hasDate = !!searchParams.get("date");
        const hasSlot = !!searchParams.get("slot");
        const index =
            hasServices && hasDate && hasSlot
                ? 3
                : hasServices && hasDate
                ? 2
                : hasServices
                ? 1
                : 0;
        return { index, gen: 0 };
    });
    const advance = (index: number) =>
        setStep((s) => ({ index, gen: s.gen + 1}));

    const serviceIds =
        searchParams.get("services")?.split(",").filter(Boolean).map(Number) ?? [];
    const selectedServices = serviceIds
        .map((id) => services.find((s) => s.id === id))
        .filter((s): s is Service => !!s);

    const personsSummary = selectedServices.map((s) => s.name).join(" • ");

    const dateParam = searchParams.get("date");
    const dateSummary = dateParam
        ? format(new Date(dateParam), "d. MMMM yyyy", { locale: cs })
        : "";

    const slotParam = searchParams.get("slot");
    const selectedSlot = slotParam ? Number(slotParam) : undefined;
    const extraMinutes = Number(searchParams.get("extraMinutes") ?? 0);
    const totalDuration =
        selectedServices.reduce((sum, s) => sum + s.durationMinutes, 0) +
        extraMinutes;
    const slotSummary = slotParam
        ? `${formatTime(Number(slotParam))} – ${formatTime(Number(slotParam) + totalDuration)}`
        : "";

    function cancelReservation() {
        router.push("/");
    }

    function goToDetails() {
        if (selectedSlot === undefined || !dateParam) return;
        const params = new URLSearchParams({
            date: dateParam,
            services: serviceIds.join(","),
            slot: String(selectedSlot),
        });
        if (extraMinutes > 0) {
            params.set("extraMinutes", String(extraMinutes));
        }
        router.push(`/rezervace/details?${params.toString()}`);
    }

    return (
        <div>
            <StepCard
                thisStep={0}
                activeStep={step.index}
                gen={step.gen}
                summary={personsSummary}
                collapsible={step.index > 0}
            >
                <PersonsStep
                    services={services}
                    onContinueAction={() => advance(1)}
                    onChangeAction={() => step.index > 0 && advance(0)}
                />
            </StepCard>
            {step.index >= 1 && (
                <StepCard
                    thisStep={1}
                    activeStep={step.index}
                    gen={step.gen}
                    summary={dateSummary}
                    collapsible={step.index > 1}
                >
                    <DateStep onContinueAction={() => advance(2)} />
                </StepCard>
            )}
            {step.index >= 2 && (
                <StepCard
                    thisStep={2}
                    activeStep={step.index}
                    gen={step.gen}
                    summary={slotSummary}
                    collapsible={selectedSlot !== undefined}
                >
                    <TimeSlotStep onSelectAction={() => advance(3)} />
                </StepCard>
            )}

            <div className="mt-4 mb-8 flex justify-between">
                <Button
                    type="button"
                    size="lg"
                    variant="outline"
                    onClick={cancelReservation}
                >
                    <X className="size-4" />
                    Zrušit
                </Button>
                <Button
                    type="button"
                    size="lg"
                    disabled={
                        serviceIds.length === 0 ||
                        !dateParam ||
                        selectedSlot === undefined
                    }
                    onClick={goToDetails}
                >
                    <Check className="size-4" />
                    Pokračovat
                </Button>
            </div>
        </div>
    );
}
