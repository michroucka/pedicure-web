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
import { Textarea } from "@/components/ui/textarea.tsx";
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
    StickyNote,
    X,
} from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip.tsx";
import {
    formatPhoneNumber,
    formatTime,
    normalizeForSearch,
    toUtcMidnight,
} from "@/lib/utils.ts";
import {
    createManualBookingAction,
    getManualBookingSlotsAction,
} from "@/app/(admin)/(dashboard)/kalendar/actions.ts";
import type { Service } from "@/lib/generated/prisma/client.ts";

type PersonInput = {
    name: string;
    serviceId: number | undefined;
};

type ClientOption = {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
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
    clients,
    defaultDate,
}: {
    services: Service[];
    clients: ClientOption[];
    defaultDate: Date;
}) {
    const [open, setOpen] = useState(false);
    const [phone, setPhone] = useState("");
    const [note, setNote] = useState("");
    // Carried silently from an autocomplete pick, never shown/edited in
    // this form — see pickClient below.
    const [pickedEmail, setPickedEmail] = useState<string>();
    const [suggestOpen, setSuggestOpen] = useState(false);
    const [people, setPeople] = useState<PersonInput[]>([emptyPerson()]);
    const [date, setDate] = useState<Date | undefined>(defaultDate);
    const [source, setSource] = useState<"PHONE" | "IN_PERSON">("PHONE");
    const [slots, setSlots] = useState<number[]>();
    const [selectedSlot, setSelectedSlot] = useState<number>();
    const [customTime, setCustomTime] = useState(false);
    const [customTimeValue, setCustomTimeValue] = useState("");
    const [error, setError] = useState<string>();
    const [isPending, startTransition] = useTransition();
    const [isLoadingSlots, startSlotsTransition] = useTransition();

    function refreshSlots(d: Date | undefined, ppl: PersonInput[]) {
        setSelectedSlot(undefined);
        setCustomTime(false);
        setCustomTimeValue("");
        setSlots(undefined);
        const serviceIds = ppl.map((p) => p.serviceId);
        if (!d || serviceIds.some((id) => id === undefined)) return;
        startSlotsTransition(async () => {
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

    function updateMainContactName(name: string) {
        updatePersonField(0, { name });
        // Typing after a pick means it might not be the same person anymore
        // — the phone the admin sees stays as-is (she can just edit it),
        // but the silently-carried email shouldn't follow a name that no
        // longer matches who it came from.
        setPickedEmail(undefined);
        setSuggestOpen(true);
    }

    function pickClient(client: ClientOption) {
        updatePersonField(0, { name: client.name });
        setPhone(formatPhoneNumber(client.phone ?? ""));
        setPickedEmail(client.email ?? undefined);
        setSuggestOpen(false);
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
        setNote("");
        setPickedEmail(undefined);
        setSuggestOpen(false);
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
                phone: phone.trim() || undefined,
                email: pickedEmail,
                note: note.trim() || undefined,
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

    const normalizedMainName = normalizeForSearch(people[0].name.trim());
    const suggestions = normalizedMainName
        ? clients
              .filter((c) =>
                  normalizeForSearch(c.name).includes(normalizedMainName)
              )
              .slice(0, 6)
        : [];

    return (
        <>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        type="button"
                        size="icon-xl"
                        className="rounded-full shadow-lg"
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
                            <div className="relative">
                                <Input
                                    placeholder="Jméno"
                                    value={people[0].name}
                                    onChange={(e) =>
                                        updateMainContactName(e.target.value)
                                    }
                                    onFocus={() => setSuggestOpen(true)}
                                    onBlur={() => setSuggestOpen(false)}
                                />
                                {suggestOpen && suggestions.length > 0 && (
                                    <div
                                        className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-md border bg-popover shadow-md"
                                        // Keeps the name Input focused on tap
                                        // so onBlur doesn't close this list
                                        // before the click below registers.
                                        onMouseDown={(e) =>
                                            e.preventDefault()
                                        }
                                    >
                                        {suggestions.map((c) => (
                                            <button
                                                key={c.id}
                                                type="button"
                                                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition hover:bg-muted/50"
                                                onClick={() => pickClient(c)}
                                            >
                                                <span className="truncate font-medium">
                                                    {c.name}
                                                </span>
                                                {c.phone && (
                                                    <span className="shrink-0 text-xs text-muted-foreground">
                                                        {c.phone}
                                                    </span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <span className="flex items-center gap-1 text-sm font-medium">
                                <Phone className="size-4" />
                                Telefonní číslo (nepovinné)
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
                            <span className="flex items-center gap-1 text-sm font-medium">
                                <StickyNote className="size-4" />
                                Poznámka (nepovinné)
                            </span>
                            <Textarea
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                            />
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
                                    <span className="font-medium">
                                        Vlastní čas:
                                    </span>
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
                            ) : isLoadingSlots ? (
                                <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
                                    <Spinner className="size-4" />
                                    Načítám dostupné termíny…
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
