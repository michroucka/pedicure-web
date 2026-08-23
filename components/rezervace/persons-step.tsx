"use client";

import { Service } from "@/lib/generated/prisma/client.ts";
import { useRouter } from "next/navigation";
import { usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button.tsx";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import {
    Select,
    SelectValue,
    SelectTrigger,
    SelectLabel,
    SelectItem,
    SelectContent,
    SelectGroup,
} from "@/components/ui/select";
import { useState } from "react";

export function PersonsStep({
    services,
    onContinueAction,
    onChangeAction,
}: {
    services: Service[];
    onContinueAction: () => void;
    onChangeAction: () => void;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const currentServices =
        searchParams.get("services")?.split(",").filter(Boolean) ?? [];
    const [personCount, setPersonCount] = useState(() =>
        Math.max(currentServices.length, 1)
    );

    function updateService(index: number, value: string) {
        onChangeAction?.();
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
        params.delete("date");
        params.delete("slot");
        params.delete("error");
        router.push(`${pathname}?${params.toString()}`);
    }

    function removePerson(index: number) {
        onChangeAction?.();
        updateService(index, "none");
        setPersonCount((c) => Math.max(c - 1, 1));
    }

    function addPerson() {
        onChangeAction?.();
        const params = new URLSearchParams(searchParams);
        params.delete("date");
        params.delete("slot");
        params.delete("error");
        router.push(`${pathname}?${params.toString()}`);
        setPersonCount((c) => c + 1);
    }

    return (
        <div>
            {Array.from({ length: personCount }).map((_, i) => {
                const selectedService = services.find(
                    (s) => String(s.id) === currentServices[i]
                );

                return (
                    <div
                        key={i}
                        className="mb-2"
                    >
                        <div className="flex items-center gap-2">
                            <span className="w-16">{`Osoba ${i + 1}`}</span>
                            <Select
                                onValueChange={(v) => v && updateService(i, v)}
                                value={currentServices[i] ?? ""}
                            >
                                <SelectTrigger className="w-full max-w-48">
                                    <SelectValue placeholder="Vyberte službu" />
                                </SelectTrigger>
                                <SelectContent position="popper">
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
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => removePerson(i)}
                                >
                                    <Trash2 data-icon="inline-start" className="text-destructive" />
                                </Button>
                            )}
                        </div>
                        {selectedService?.description && (
                            <p className="mt-1 px-2 text-xs text-pretty text-muted-foreground">
                                {selectedService.description}
                            </p>
                        )}
                    </div>
                );
            })}
            <div className="mt-2 flex">
                {personCount < 4 && (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={addPerson}
                    >
                        <Plus data-icon="inline-start" />
                        Přidat osobu
                    </Button>
                )}
                <Button
                    type="button"
                    className="ms-auto"
                    disabled={currentServices.length < personCount}
                    onClick={onContinueAction}
                >
                    <ChevronDown className="size-4" />
                    Pokračovat
                </Button>
            </div>
        </div>
    );
}
