"use client";

import { Service } from "@/lib/generated/prisma/client";
import { useRouter } from "next/navigation";
import { usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronDown, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { parseServiceIdsParam } from "@/lib/booking-url";
import { CzechText } from "@/components/czech-text";
import { cn } from "@/lib/utils";

function formatServiceMeta(service: Service) {
    return `${service.durationMinutes} min · ${service.price} Kč`;
}

function ServiceCards({
    services,
    personIndex,
    selectedId,
    onSelect,
}: {
    services: Service[];
    personIndex: number;
    selectedId: string | undefined;
    onSelect: (serviceId: string) => void;
}) {
    return (
        <div
            role="radiogroup"
            aria-label={`Služba pro osobu ${personIndex + 1}`}
            className="flex flex-col gap-2"
        >
            {services.map((service) => {
                const id = String(service.id);
                const isSelected = id === selectedId;
                return (
                    <label
                        key={service.id}
                        className={cn(
                            "flex cursor-pointer gap-3 rounded-xl border bg-card px-4 py-3 transition-colors hover:border-primary/60 has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/30",
                            isSelected && "border-primary bg-primary/5"
                        )}
                    >
                        <input
                            type="radio"
                            name={`service-person-${personIndex}`}
                            value={id}
                            checked={isSelected}
                            // onClick, not only onChange: clicking the
                            // already-selected card has to close the picker too.
                            onClick={() => onSelect(id)}
                            onChange={() => {}}
                            className="mt-1 size-4 shrink-0 accent-primary"
                        />
                        <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                                <span className="font-medium">
                                    {service.name}
                                </span>
                                <span className="text-sm whitespace-nowrap text-muted-foreground tabular-nums">
                                    {formatServiceMeta(service)}
                                </span>
                            </span>
                            {service.description && (
                                <span className="mt-0.5 block text-sm text-pretty text-muted-foreground">
                                    {service.description}
                                </span>
                            )}
                        </span>
                    </label>
                );
            })}
        </div>
    );
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
    // A person with a service is a one-line summary; "Změnit" reopens the
    // cards for them. People without a service always show the cards.
    const [editingIndex, setEditingIndex] = useState<number | null>(null);

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
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
    }

    function selectService(index: number, serviceId: string) {
        setEditingIndex(null);
        if (serviceId !== currentServices[index]) {
            updateService(index, serviceId);
        }
    }

    function removePerson(index: number) {
        onChangeAction?.();
        setEditingIndex(null);
        updateService(index, "none");
        setPersonCount(Math.max(shownPersonCount - 1, 1));
    }

    function addPerson() {
        onChangeAction?.();
        setEditingIndex(null);
        const params = new URLSearchParams(searchParams);
        params.delete("date");
        params.delete("slot");
        params.delete("error");
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
        setPersonCount(shownPersonCount + 1);
    }

    const isGroup = shownPersonCount > 1;
    const everyoneHasService = currentServices.length >= shownPersonCount;

    return (
        <CzechText>
            <div>
                <div className="flex flex-col gap-4">
                    {Array.from({ length: shownPersonCount }).map((_, i) => {
                        const selectedService = services.find(
                            (s) => String(s.id) === currentServices[i]
                        );
                        const isPicking =
                            !selectedService || editingIndex === i;

                        return (
                            <div
                                key={i}
                                className="flex flex-col gap-2"
                            >
                                {(isGroup || !isPicking) && (
                                    <div className="flex min-h-10 items-center gap-2">
                                        <div className="min-w-0 flex-1">
                                            {isGroup && (
                                                <div className="text-sm text-muted-foreground">
                                                    {`Osoba ${i + 1}`}
                                                </div>
                                            )}
                                            {selectedService && !isPicking && (
                                                <div>
                                                    <span className="font-medium">
                                                        {selectedService.name}
                                                    </span>{" "}
                                                    <span className="text-sm whitespace-nowrap text-muted-foreground tabular-nums">
                                                        {formatServiceMeta(
                                                            selectedService
                                                        )}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        {selectedService && !isPicking && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                onClick={() =>
                                                    setEditingIndex(i)
                                                }
                                            >
                                                <Pencil data-icon="inline-start" />
                                                Změnit
                                            </Button>
                                        )}
                                        {/* The first person can't be removed. */}
                                        {i > 0 && (
                                            <Button
                                                type="button"
                                                size="icon"
                                                variant="ghost"
                                                aria-label={`Odebrat osobu ${i + 1}`}
                                                onClick={() => removePerson(i)}
                                            >
                                                <Trash2 className="text-destructive" />
                                            </Button>
                                        )}
                                    </div>
                                )}
                                {isPicking && (
                                    <ServiceCards
                                        services={services}
                                        personIndex={i}
                                        selectedId={currentServices[i]}
                                        onSelect={(serviceId) =>
                                            selectService(i, serviceId)
                                        }
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
                <div className="mt-5 flex">
                    {/* The URL can't hold an empty spot ("1,,3" parses as
                        [1, 3]), so the next person can only be added once
                        everyone before them has a service. */}
                    {shownPersonCount < 4 && (
                        <Button
                            type="button"
                            variant="outline"
                            disabled={!everyoneHasService}
                            onClick={addPerson}
                        >
                            <Plus data-icon="inline-start" />
                            Přidat osobu
                        </Button>
                    )}
                    <Button
                        type="button"
                        className="ms-auto"
                        disabled={!everyoneHasService}
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
