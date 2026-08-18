"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getAvailableSlotsAction } from "@/app/reservation/actions.ts";
import { formatTime } from "@/lib/utils.ts";
import { Button } from "@/components/ui/button.tsx";

export function TimeSlotStep({ onSelectAction }: { onSelectAction: () => void }) {
    const [availableSlots, setAvailableSlots] = useState<number[]>([]);

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

    useEffect(() => {
        if (!date) return;
        const selectedDate = date;

        async function load() {
            const slots = await getAvailableSlotsAction(
                selectedDate,
                currentServices
            );
            setAvailableSlots(slots);
        }
        load();
    }, [searchParams.get("services"), searchParams.get("date")]);

    function selectSlot(s: number) {
        const params = new URLSearchParams(searchParams);
        params.set("slot", String(s));
        params.delete("error");
        router.push(`${pathname}?${params.toString()}`);
        onSelectAction();
    }

    return (
        <div className="grid grid-cols-4 lg:grid-cols-5 gap-2">
            {availableSlots.map((s) => (
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
    )
}
