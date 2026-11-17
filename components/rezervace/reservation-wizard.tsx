"use client";

import { Service } from "@/lib/generated/prisma/client";
import { useState, useTransition } from "react";
import { Spinner } from "@/components/ui/spinner";
import { StepCard } from "@/components/rezervace/step-card";
import { PersonsStep } from "@/components/rezervace/persons-step";
import { DateStep } from "@/components/rezervace/date-step";
import { TimeSlotStep } from "@/components/rezervace/time-slot-step";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { formatTime } from "@/lib/utils";
import { formatDuration } from "@/lib/format-duration";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check } from "lucide-react";
import Link from "next/link";
import { parseServiceIdsParam } from "@/lib/booking-url";
import { CzechText } from "@/components/czech-text";

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
        setStep((s) => ({ index, gen: s.gen + 1 }));

    const serviceIds = parseServiceIdsParam(searchParams.get("services"));
    const selectedServices = serviceIds
        .map((id) => services.find((s) => s.id === id))
        .filter((s): s is Service => !!s);

    const personsSummary = selectedServices.map((s) => s.name).join(" • ");

    const dateParam = searchParams.get("date");
    const dateSummary = dateParam
        ? format(new Date(dateParam), "EEEE d. MMMM yyyy", { locale: cs })
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

    const [isOpeningDetails, startDetailsTransition] = useTransition();

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
        startDetailsTransition(() => {
            router.push(`/rezervace/details?${params.toString()}`);
        });
    }

    return (
        <CzechText>
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
                        headerAside={`Celkem ${formatDuration(totalDuration)}`}
                        collapsible={selectedSlot !== undefined}
                    >
                        <TimeSlotStep onSelectAction={() => advance(3)} />
                    </StepCard>
                )}

                <div className="mt-4 mb-2 flex justify-between">
                    <Link
                        href="/"
                        className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                        <ArrowLeft className="size-4" />
                        Zpět na web
                    </Link>
                    {/* Only once a time is picked - before that the step
                        cards have their own "Pokračovat", and two buttons
                        with the same label doing different things confuse. */}
                    {serviceIds.length > 0 &&
                        dateParam &&
                        selectedSlot !== undefined && (
                            <Button
                                type="button"
                                size="lg"
                                disabled={isOpeningDetails}
                                onClick={goToDetails}
                            >
                                {isOpeningDetails ? (
                                    <Spinner className="size-4" />
                                ) : (
                                    <Check className="size-4" />
                                )}
                                Pokračovat
                            </Button>
                        )}
                </div>
            </div>
        </CzechText>
    );
}
