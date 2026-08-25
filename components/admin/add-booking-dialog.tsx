"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Calendar } from "@/components/ui/calendar.tsx";
import { Alert, AlertTitle } from "@/components/ui/alert.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select.tsx";
import {
    AlertCircle,
    Phone as PhoneIcon,
    Plus,
    Trash2,
    Check,
    UserRound,
    Phone,
    Sparkles,
    X,
} from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip.tsx";
import { formatPhoneNumber, formatTime, toUtcMidnight } from "@/lib/utils.ts";
import {
    createManualBookingAction,
    getManualBookingSlotsAction,
} from "@/app/(admin)/(dashboard)/kalendar/actions.ts";
import type { Service } from "@/lib/generated/prisma/client.ts";

type PersonInput = {
    name: string;
    serviceId: number | undefined;
};

const emptyPerson = (): PersonInput => ({
    name: "",
    serviceId: undefined,
});

const SOURCE_OPTIONS: { value: "PHONE" | "IN_PERSON"; label: string }[] = [
    { value: "PHONE", label: "Telefonicky" },
    { value: "IN_PERSON", label: "Osobně" },
];

export function AddBookingDialog({
    services,
    defaultDate,
}: {
    services: Service[];
    defaultDate: Date;
}) {
    const [open, setOpen] = useState(false);
    const [phone, setPhone] = useState("");
    const [people, setPeople] = useState<PersonInput[]>([emptyPerson()]);
    const [date, setDate] = useState<Date | undefined>(defaultDate);
    const [source, setSource] = useState<"PHONE" | "IN_PERSON">("PHONE");
    const [slots, setSlots] = useState<number[]>();
    const [selectedSlot, setSelectedSlot] = useState<number>();
    const [customTime, setCustomTime] = useState(false);
    const [customTimeValue, setCustomTimeValue] = useState("");
    const [error, setError] = useState<string>();
    const [isPending, startTransition] = useTransition();

    function refreshSlots(d: Date | undefined, ppl: PersonInput[]) {
        setSelectedSlot(undefined);
        setCustomTime(false);
        setCustomTimeValue("");
        setSlots(undefined);
        const serviceIds = ppl.map((p) => p.serviceId);
        if (!d || serviceIds.some((id) => id === undefined)) return;
        startTransition(async () => {
            const result = await getManualBookingSlotsAction(
                serviceIds as number[],
                format(d, "yyyy-MM-dd")
            );
            setSlots(result);
        });
    }

    function updatePersonService(i: number, serviceId: number) {
        const next = people.map((p, idx) =>
            idx === i ? { ...p, serviceId } : p
        );
        setPeople(next);
        refreshSlots(date, next);
    }

    function updatePersonField(i: number, patch: Partial<PersonInput>) {
        setPeople((prev) =>
            prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p))
        );
    }

    function addPerson() {
        if (people.length >= 4) return;
        const next = [...people, emptyPerson()];
        setPeople(next);
        refreshSlots(date, next);
    }

    function removePerson(i: number) {
        const next = people.filter((_, idx) => idx !== i);
        setPeople(next);
        refreshSlots(date, next);
    }

    function pickDate(d: Date | undefined) {
        setDate(d);
        refreshSlots(d, people);
    }

    function reset() {
        setPhone("");
        setPeople([emptyPerson()]);
        setDate(defaultDate);
        setSource("PHONE");
        setSlots(undefined);
        setSelectedSlot(undefined);
        setCustomTime(false);
        setCustomTimeValue("");
        setError(undefined);
    }

    function pickCustomTime(value: string) {
        setCustomTimeValue(value);
        const [h, m] = value.split(":").map(Number);
        setSelectedSlot(
            Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : undefined
        );
    }

    function submit() {
        setError(undefined);

        if (!phone.trim()) {
            setError("Vyplňte telefon.");
            return;
        }
        if (people.some((p) => !p.name.trim() || !p.serviceId)) {
            setError("Vyplňte jméno a službu pro každou osobu.");
            return;
        }
        if (!date || selectedSlot === undefined) {
            setError("Vyberte datum a čas.");
            return;
        }

        startTransition(async () => {
            const result = await createManualBookingAction({
                phone: phone.trim(),
                people: people.map((p) => ({
                    name: p.name.trim(),
                    serviceId: p.serviceId!,
                })),
                dateStr: format(date, "yyyy-MM-dd"),
                startTime: selectedSlot,
                source,
                outsideHours: customTime,
            });
            if (!result.ok) {
                setError(result.error);
                return;
            }
            setOpen(false);
            reset();
        });
    }

    return (
        <>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        type="button"
                        size="icon-xl"
                        className="fixed right-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-10 rounded-full shadow-lg"
                        onClick={() => {
                            reset();
                            setOpen(true);
                        }}
                    >
                        <Plus className="size-6" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="left">Přidat rezervaci</TooltipContent>
            </Tooltip>

            <Dialog
                open={open}
                onOpenChange={(o) => {
                    setOpen(o);
                    if (!o) reset();
                }}
            >
                <DialogContent className="max-h-[90svh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Přidat rezervaci</DialogTitle>
                    </DialogHeader>

                    <div className="grid grid-cols-2 gap-2">
                        {SOURCE_OPTIONS.map((opt) => (
                            <Button
                                key={opt.value}
                                type="button"
                                variant={
                                    source === opt.value ? "default" : "outline"
                                }
                                onClick={() => setSource(opt.value)}
                            >
                                {opt.value === "PHONE" ? (
                                    <PhoneIcon className="size-4" />
                                ) : (
                                    <UserRound className="size-4" />
                                )}
                                {opt.label}
                            </Button>
                        ))}
                    </div>

                    <div className="flex flex-col gap-3">
                        <div className="flex flex-col gap-2 rounded-2xl border p-3">
                            <div className="flex items-center justify-between">
                                <span className="flex items-center gap-1 text-sm font-medium">
                                    <UserRound className="size-4" />
                                    Hlavní kontakt
                                </span>
                            </div>
                            <Input
                                placeholder="Jméno"
                                value={people[0].name}
                                onChange={(e) =>
                                    updatePersonField(0, {
                                        name: e.target.value,
                                    })
                                }
                            />
                            <span className="flex items-center gap-1 text-sm font-medium">
                                <Phone className="size-4" />
                                Telefonní číslo
                            </span>
                            <Input
                                placeholder="+420 123 456 789"
                                value={phone}
                                onChange={(e) =>
                                    setPhone(formatPhoneNumber(e.target.value))
                                }
                            />
                            <span className="flex items-center gap-1 text-sm font-medium">
                                <Sparkles className="size-4" />
                                Služba
                            </span>
                            <Select
                                value={
                                    people[0].serviceId
                                        ? String(people[0].serviceId)
                                        : ""
                                }
                                onValueChange={(v) =>
                                    updatePersonService(0, Number(v))
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Vyberte službu" />
                                </SelectTrigger>
                                <SelectContent position="popper">
                                    <SelectGroup>
                                        <SelectLabel>Služby</SelectLabel>
                                        {services.map((s) => (
                                            <SelectItem
                                                key={s.id}
                                                value={String(s.id)}
                                            >
                                                {s.name}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </div>

                        {people.slice(1).map((person, i) => (
                            <div
                                key={i + 1}
                                className="flex flex-col gap-2 rounded-2xl border p-3"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="flex items-center gap-1 text-sm font-medium">
                                        <UserRound className="size-4" />
                                        Osoba {i + 2}
                                    </span>
                                    {people.length > 1 && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon-sm"
                                            onClick={() => removePerson(i + 1)}
                                        >
                                            <Trash2 className="size-4" />
                                        </Button>
                                    )}
                                </div>
                                <Input
                                    placeholder="Jméno"
                                    value={person.name}
                                    onChange={(e) =>
                                        updatePersonField(i + 1, {
                                            name: e.target.value,
                                        })
                                    }
                                />
                                <Select
                                    value={
                                        person.serviceId
                                            ? String(person.serviceId)
                                            : ""
                                    }
                                    onValueChange={(v) =>
                                        updatePersonService(i + 1, Number(v))
                                    }
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Vyberte službu" />
                                    </SelectTrigger>
                                    <SelectContent position="popper">
                                        <SelectGroup>
                                            <SelectLabel>Služby</SelectLabel>
                                            {services.map((s) => (
                                                <SelectItem
                                                    key={s.id}
                                                    value={String(s.id)}
                                                >
                                                    {s.name}
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </div>
                        ))}

                        {people.length < 4 && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={addPerson}
                            >
                                <Plus className="size-4" />
                                Přidat osobu
                            </Button>
                        )}

                        <Calendar
                            mode="single"
                            locale={cs}
                            selected={date}
                            onSelect={pickDate}
                            disabled={(day) =>
                                toUtcMidnight(day).getTime() <
                                toUtcMidnight(new Date()).getTime()
                            }
                            className="w-full bg-transparent"
                        />

                        {date &&
                            people.every((p) => p.serviceId !== undefined) &&
                            (customTime ? (
                                <div className="flex items-center gap-2">
                                    <span className="font-medium">Vlastní čas:</span>
                                    <Input
                                        type="time"
                                        value={customTimeValue}
                                        onChange={(e) =>
                                            pickCustomTime(e.target.value)
                                        }
                                        className="w-auto"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        onClick={() => {
                                            setCustomTime(false);
                                            setCustomTimeValue("");
                                            setSelectedSlot(undefined);
                                        }}
                                    >
                                        <X className="size-4" />
                                    </Button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-4 gap-2">
                                    {slots?.length === 0 && (
                                        <p className="col-span-4 text-center text-sm text-muted-foreground">
                                            Žádné volné termíny.
                                        </p>
                                    )}
                                    {slots?.map((s) => (
                                        <Button
                                            key={s}
                                            type="button"
                                            size="sm"
                                            variant={
                                                s === selectedSlot
                                                    ? "default"
                                                    : "outline"
                                            }
                                            onClick={() => setSelectedSlot(s)}
                                        >
                                            {formatTime(s)}
                                        </Button>
                                    ))}
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="hover:bg-accent"
                                        onClick={() => {
                                            setCustomTime(true);
                                            setSelectedSlot(undefined);
                                        }}
                                    >
                                        <Plus className="size-4 text-primary" />
                                    </Button>
                                </div>
                            ))}

                        {error && (
                            <Alert variant="destructive">
                                <AlertCircle />
                                <AlertTitle>{error}</AlertTitle>
                            </Alert>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            size="lg"
                            disabled={isPending}
                            onClick={submit}
                        >
                            {isPending ? (
                                <Spinner className="size-4" />
                            ) : (
                                <Check className="size-4" />
                            )}
                            {isPending ? "Ukládám…" : "Přidat rezervaci"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
