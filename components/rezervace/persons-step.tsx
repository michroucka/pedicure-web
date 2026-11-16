"use client";

import { Service } from "@/lib/generated/prisma/client";
import { useRouter } from "next/navigation";
import { usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
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
import { parseServiceIdsParam } from "@/lib/booking-url";
import { CzechText } from "@/components/czech-text";

function formatServiceMeta(service: Service) {
    return `${service.durationMinutes} min · ${service.price} Kč`;
}

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

    // Strings, because that's what the service <Select> values are.
    const currentServices = parseServiceIdsParam(
        searchParams.get("services")
    ).map(String);
    const [personCount, setPersonCount] = useState(() =>
        Math.max(currentServices.length, 1)
    );
    // Rows shown: the URL's services, plus any empty rows added with
    // "Přidat osobu". Never fewer than the URL holds - personCount is only
    // set once, so after browser back/forward the URL can have more people
    // than the state, which would hide some of them from the form.
    const shownPersonCount = Math.max(personCount, currentServices.length);

    function updateService(index: number, value: string) {
        onChangeAction?.();
        const next = [...currentServices];

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
        setPersonCount(Math.max(shownPersonCount - 1, 1));
    }

    function addPerson() {
        onChangeAction?.();
        const params = new URLSearchParams(searchParams);
        params.delete("date");
        params.delete("slot");
        params.delete("error");
        router.push(`${pathname}?${params.toString()}`);
        setPersonCount(shownPersonCount + 1);
    }

    return (
        <CzechText>
            <div>
                <div className="flex flex-col gap-4">
                    {Array.from({ length: shownPersonCount }).map((_, i) => {
                        const selectedService = services.find(
                            (s) => String(s.id) === currentServices[i]
                        );

                        return (
                            <div
                                key={i}
                                className="grid grid-cols-[4.5rem_minmax(0,1fr)_2.5rem] items-center gap-x-2 gap-y-1.5"
                            >
                                <span>{`Osoba ${i + 1}`}</span>
                                {/* The URL can't hold an empty spot ("1,,3" parses
                                as [1, 3]), so a person can only be picked once
                                everyone before them has a service. */}
                                <Select
                                    onValueChange={(v) =>
                                        v && updateService(i, v)
                                    }
                                    value={currentServices[i] ?? ""}
                                    disabled={i > currentServices.length}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Vyberte službu" />
                                    </SelectTrigger>
                                    <SelectContent position="popper">
                                        <SelectGroup>
                                            <SelectLabel>Služby</SelectLabel>
                                            {services.map((s) => (
                                                <SelectItem
                                                    value={String(s.id)}
                                                    key={s.id}
                                                    hint={formatServiceMeta(s)}
                                                >
                                                    {s.name}
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                                {/* The first person can't be removed; the empty
                                cell keeps every select the same width. */}
                                {i > 0 ? (
                                    <Button
                                        type="button"
                                        size="icon"
                                        variant="ghost"
                                        aria-label={`Odebrat osobu ${i + 1}`}
                                        onClick={() => removePerson(i)}
                                    >
                                        <Trash2 className="text-destructive" />
                                    </Button>
                                ) : (
                                    <span />
                                )}
                                {selectedService && (
                                    <div className="col-span-2 col-start-2 text-xs text-pretty text-muted-foreground">
                                        {/* div, not p: the step card's accordion adds
                                        a bottom margin to every non-last <p>. */}
                                        <div className="font-medium text-foreground/80">
                                            {formatServiceMeta(selectedService)}
                                        </div>
                                        {selectedService.description && (
                                            <p className="mt-0.5">
                                                {selectedService.description}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
                <div className="mt-5 flex">
                    {shownPersonCount < 4 && (
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
                        disabled={currentServices.length < shownPersonCount}
                        onClick={onContinueAction}
                    >
                        <ChevronDown className="size-4" />
                        Pokračovat
                    </Button>
                </div>
            </div>
        </CzechText>
    );
}
