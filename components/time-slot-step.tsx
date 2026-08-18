"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { getAvailableSlotsAction } from "@/app/reservation/actions.ts";
import { formatTime } from "@/lib/utils.ts";
import { Button } from "@/components/ui/button.tsx";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { AlertCircle, CalendarX } from "lucide-react";

export function TimeSlotStep({ onSelectAction }: { onSelectAction: () => void }) {
    const [availableSlots, setAvailableSlots] = useState<number[]>();
    const [isLoading, startTransition] = useTransition();

    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const dateParam = searchParams.get("date");
    const date = dateParam ? new Date(dateParam) : undefined;

    const currentServices: number[] =
        searchParams.get("services")?.split(",").filter(Boolean).map(Number) ??
        [];

    const slotParam = searchParams.get("slot");
    const selectedSlot = slotParam ? Number(slotParam) : undefined;
    const error = searchParams.get("error");

    useEffect(() => {
        if (!date) return;
        const selectedDate = date;

        startTransition(async () => {
            const slots = await getAvailableSlotsAction(
                selectedDate,
                currentServices
            );
            setAvailableSlots(slots);
        });
    }, [searchParams.get("services"), searchParams.get("date")]);

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
                    <AlertTitle>Termín již není volný</AlertTitle>
                    <AlertDescription>
                        Tento termín je již obsazený. Vyberte prosím jiný čas.
                    </AlertDescription>
                </Alert>
            )}
            {!isLoading && availableSlots?.length === 0 ? (
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
