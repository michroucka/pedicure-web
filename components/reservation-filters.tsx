"use client";

import { Service } from "@/lib/generated/prisma/client.ts";
import { useRouter } from "next/navigation";
import { usePathname, useSearchParams } from "next/navigation";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button.tsx";
import { ChevronDownIcon, Plus, Trash2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar.tsx";
import {
    Select,
    SelectValue,
    SelectTrigger,
    SelectLabel,
    SelectItem,
    SelectContent,
    SelectGroup,
} from "@/components/ui/select";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { useState } from "react";

export function ReservationFilters({ services }: { services: Service[] }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const dateParam = searchParams.get("date");
    const date = dateParam ? new Date(dateParam) : undefined;

    const currentServices =
        searchParams.get("services")?.split(",").filter(Boolean) ?? [];
    const [personCount, setPersonCount] = useState(() =>
        Math.max(currentServices.length, 1)
    );

    function updateParam(key: string, value: string) {
        const params = new URLSearchParams(searchParams);
        params.set(key, value);
        params.delete("slot");
        params.delete("error");
        router.push(`${pathname}?${params.toString()}`);
    }

    function updateService(index: number, value: string) {
        const current =
            searchParams.get("services")?.split(",").filter(Boolean) ?? [];
        const next = [...current];

        if (value === "none") {
            next.splice(index, 1);
        } else {
            next[index] = value;
        }

        const params = new URLSearchParams(searchParams);
        if (next.length > 0) {
            params.set("services", next.join(","));
        } else {
            params.delete("services");
        }
        params.delete("slot");
        params.delete("error");
        router.push(`${pathname}?${params.toString()}`);
    }

    function removePerson(index: number) {
        updateService(index, "none");
        setPersonCount((c) => Math.max(c - 1, 1));
    }

    return (
        <div>
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        data-empty={!date}
                        className="w-53 justify-between text-left font-normal data-[empty=true]:text-muted-foreground"
                    >
                        {date ? (
                            format(date, "d. MMMM yyyy", { locale: cs })
                        ) : (
                            <span>Vyberte datum</span>
                        )}
                        <ChevronDownIcon />
                    </Button>
                </PopoverTrigger>
                <PopoverContent
                    className="w-auto p-0"
                    align="start"
                >
                    <Calendar
                        mode="single"
                        locale={cs}
                        selected={date}
                        onSelect={(d) =>
                            d && updateParam("date", format(d, "yyyy-MM-dd"))
                        }
                        defaultMonth={date}
                    />
                </PopoverContent>
            </Popover>

            {Array.from({ length: personCount }).map((_, i) => (
                <div
                    key={i}
                    className="flex items-center gap-2"
                >
                    <Select
                        onValueChange={(v) => v && updateService(i, v)}
                        value={currentServices[i] ?? ""}
                    >
                        <SelectTrigger className="w-full max-w-48">
                            <SelectValue placeholder="Vyberte službu" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                <SelectLabel>Služby</SelectLabel>
                                {services.map((s) => (
                                    <SelectItem
                                        value={String(s.id)}
                                        key={s.id}
                                    >
                                        {s.name}
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                    {i > 0 && (
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => removePerson(i)}
                        >
                            <Trash2 data-icon="inline-start" />
                            Odebrat
                        </Button>
                    )}
                </div>
            ))}
            {personCount < 4 && (
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPersonCount((c) => c + 1)}
                >
                    <Plus data-icon="inline-start" />
                    Přidat osobu
                </Button>
            )}
        </div>
    );
}
