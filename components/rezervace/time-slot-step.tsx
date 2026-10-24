"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { getAvailableSlotsAction } from "@/app/rezervace/actions.ts";
import { formatTime } from "@/lib/utils.ts";
import { Button } from "@/components/ui/button.tsx";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { AlertCircle, CalendarX } from "lucide-react";
import { parseServiceIdsParam } from "@/lib/booking-url.ts";

export function TimeSlotStep({ onSelectAction }: { onSelectAction: () => void }) {
    const [availableSlots, setAvailableSlots] = useState<number[]>();
    const [isLoading, startTransition] = useTransition();

    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const dateParam = searchParams.get("date");
    const servicesParam = searchParams.get("services");
    const extraMinutesParam = searchParams.get("extraMinutes");

    const slotParam = searchParams.get("slot");
    const selectedSlot = slotParam ? Number(slotParam) : undefined;
    const error = searchParams.get("error");
    const extraMinutes = Number(extraMinutesParam ?? 0);

    // Keyed on the raw URL params (strings), not on the parsed Date/array -
    // those are new objects every render and would refetch in a loop.
    useEffect(() => {
        if (!dateParam) return;

        startTransition(async () => {
            const slots = await getAvailableSlotsAction(
                new Date(dateParam),
                parseServiceIdsParam(servicesParam),
                Number(extraMinutesParam ?? 0)
            );
            setAvailableSlots(slots);
        });
    }, [dateParam, servicesParam, extraMinutesParam]);

    function selectSlot(s: number) {
        const params = new URLSearchParams(searchParams);
        params.set("slot", String(s));
        params.delete("error");
        router.push(`${pathname}?${params.toString()}`);
        onSelectAction();
    }

    return (
        <div>
            {error === "slot_taken" && (
                <Alert
                    variant="warning"
                    className="mb-4"
                >
                    <AlertCircle />
                    <AlertTitle>Termín nedostupný</AlertTitle>
                    <AlertDescription>
                        Tento termín již není dostupný. Vyberte prosím jiný čas.
                    </AlertDescription>
                </Alert>
            )}
            {error === "extra_time_conflict" && (
                <Alert
                    variant="warning"
                    className="mb-4"
                >
                    <AlertCircle />
                    <AlertTitle>Termín nedostupný</AlertTitle>
                    <AlertDescription>
                        Podle vašich předchozích návštěv počítáme s{" "}
                        {extraMinutes} min navíc a s tím se tento termín už
                        nevejde před další rezervaci. Vyberte prosím jiný čas.
                    </AlertDescription>
                </Alert>
            )}
            {isLoading ? (
                <div className="flex flex-col items-center gap-2 py-6 text-center text-sm text-muted-foreground">
                    <Spinner className="size-6" />
                    Načítání dostupných termínů…
                </div>
            ) : availableSlots?.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-6 text-center text-sm text-muted-foreground">
                    <CalendarX className="size-6" />
                    Pro tento den už nejsou volné žádné termíny.
                    <br />
                    Vyberte prosím jiné datum.
                </div>
            ) : (
                <div className="grid grid-cols-4 lg:grid-cols-5 gap-2">
                    {availableSlots?.map((s) => (
                        <Button
                            key={s}
                            type="button"
                            variant={s === selectedSlot ? "default" : "outline"}
                            size="lg"
                            onClick={() => selectSlot(s)}
                        >
                            {formatTime(s)}
                        </Button>
                    ))}
                </div>
            )}
        </div>
    )
}
