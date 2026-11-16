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
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TimePicker } from "@/components/ui/time-picker";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    AlertCircle,
    Phone as PhoneIcon,
    Plus,
    Trash2,
    Check,
    UserRound,
    Phone,
    Tag,
    StickyNote,
    X,
    ChevronDownIcon,
} from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    cn,
    formatPhoneNumber,
    formatTime,
    normalizeForSearch,
    normalizePhoneForMatch,
    localDateToUtcMidnight,
} from "@/lib/utils";
import {
    createManualBookingAction,
    getManualBookingSlotsAction,
} from "@/app/(admin)/(dashboard)/kalendar/actions";
import type { Service } from "@/lib/generated/prisma/client";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
    ExtraTimeField,
    NO_EXTRA_TIME,
    extraTimeFromMinutes,
    extraTimeToMinutes,
    type ExtraTime,
} from "@/components/admin/extra-time-field";
import { NoteHealthHint } from "@/components/admin/note-health-hint";

type PersonInput = {
    // Stable React key: with index keys, removing a middle person would
    // animate (and reuse the state of) the wrong card.
    uid: number;
    name: string;
    serviceId: number | undefined;
    extraTime: ExtraTime;
};

type ClientOption = {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    extraTimeMinutes: number;
    active: boolean;
};

let lastPersonUid = 0;
const nextPersonUid = () => ++lastPersonUid;

// How long a removed person's card takes to fade out before it's dropped.
const PERSON_EXIT_MS = 200;

const emptyPerson = (): PersonInput => ({
    uid: nextPersonUid(),
    name: "",
    serviceId: undefined,
    extraTime: NO_EXTRA_TIME,
});

const totalExtraMinutes = (ppl: PersonInput[]) =>
    ppl.reduce((sum, p) => sum + extraTimeToMinutes(p.extraTime), 0);

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
    // this form – see pickClient below.
    const [pickedEmail, setPickedEmail] = useState<string>();
    const [suggestOpen, setSuggestOpen] = useState(false);
    const [people, setPeople] = useState<PersonInput[]>([emptyPerson()]);
    // Once the admin sets the main contact's extra time by hand, stop
    // overwriting it from whichever client the name/phone currently match.
    const [mainExtraTouched, setMainExtraTouched] = useState(false);
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
                format(d, "yyyy-MM-dd"),
                totalExtraMinutes(ppl)
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

    function updatePersonExtraTime(i: number, extraTime: ExtraTime) {
        if (i === 0) setMainExtraTouched(true);
        const next = people.map((p, idx) =>
            idx === i ? { ...p, extraTime } : p
        );
        setPeople(next);
        refreshSlots(date, next);
    }

    // Same rule as findClient on the server (by phone, or by exact name
    // when there's no phone), so the prefilled extra time belongs to the
    // client the booking will actually be saved under.
    function matchClient(name: string, phoneValue: string) {
        const normalizedPhone = normalizePhoneForMatch(phoneValue);
        if (normalizedPhone) {
            return clients.find(
                (c) =>
                    c.phone &&
                    normalizePhoneForMatch(c.phone) === normalizedPhone
            );
        }
        return clients.find((c) => c.name === name.trim());
    }

    // Applies a main contact name/phone change, prefilling their extra time
    // from the matched client – slots only refresh when the total actually
    // changed, so typing a name doesn't keep clearing the picked slot.
    function updateMainContact(name: string, phoneValue: string) {
        let next = people.map((p, idx) => (idx === 0 ? { ...p, name } : p));
        if (!mainExtraTouched) {
            const match = matchClient(name, phoneValue);
            const extraTime = extraTimeFromMinutes(
                match?.extraTimeMinutes ?? 0
            );
            next = next.map((p, idx) => (idx === 0 ? { ...p, extraTime } : p));
        }
        setPeople(next);
        if (totalExtraMinutes(next) !== totalExtraMinutes(people)) {
            refreshSlots(date, next);
        }
    }

    function updateMainContactName(name: string) {
        updateMainContact(name, phone);
        // Typing after a pick means it might not be the same person anymore
        // – the phone the admin sees stays as-is (she can just edit it),
        // but the silently-carried email shouldn't follow a name that no
        // longer matches who it came from.
        setPickedEmail(undefined);
        setSuggestOpen(true);
    }

    function updatePhone(value: string) {
        const formatted = formatPhoneNumber(value);
        setPhone(formatted);
        updateMainContact(people[0].name, formatted);
    }

    function pickClient(client: ClientOption) {
        const formatted = formatPhoneNumber(client.phone ?? "");
        setPhone(formatted);
        updateMainContact(client.name, formatted);
        setPickedEmail(client.email ?? undefined);
        setSuggestOpen(false);
    }

    function addPerson() {
        if (people.length >= 4) return;
        const next = [
            ...people,
            {
                uid: nextPersonUid(),
                name: people[0].name,
                serviceId: undefined,
                extraTime: NO_EXTRA_TIME,
            },
        ];
        setPeople(next);
        refreshSlots(date, next);
    }

    // The card fades out first and is dropped once that's done.
    const [leavingUid, setLeavingUid] = useState<number>();

    function removePerson(i: number) {
        const uid = people[i].uid;
        setLeavingUid(uid);
        setTimeout(() => {
            setLeavingUid(undefined);
            setPeople((current) => {
                const next = current.filter((p) => p.uid !== uid);
                refreshSlots(date, next);
                return next;
            });
        }, PERSON_EXIT_MS);
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
        setMainExtraTouched(false);
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
                    extraTimeMinutes: extraTimeToMinutes(p.extraTime),
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
              .filter(
                  (c) =>
                      c.active &&
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
                        aria-label="Přidat rezervaci"
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
                {/* Same layout as editing a booking (booking-detail-dialog):
                    tablet = people left, date and time right; fixed height
                    so adding a person or ticking extra time doesn't make
                    the dialog jump; footer pinned to the bottom. */}
                <DialogContent className="h-[90svh] max-h-[90svh] grid-rows-[auto_1fr_auto] overflow-y-hidden md:h-[min(90svh,46rem)] md:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Přidat rezervaci</DialogTitle>
                    </DialogHeader>

                    <div className="-mx-6 flex min-h-0 scrollbar-gutter-stable flex-col gap-3 overflow-y-auto px-6 md:grid md:grid-cols-2 md:items-start md:gap-6">
                        <div className="flex flex-col gap-3">
                            <div className="grid grid-cols-2 gap-2">
                                {SOURCE_OPTIONS.map((opt) => (
                                    <Button
                                        key={opt.value}
                                        type="button"
                                        variant={
                                            source === opt.value
                                                ? "default"
                                                : "outline"
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
                            <div className="flex flex-col gap-2 rounded-2xl border p-3">
                                <div className="flex items-center justify-between">
                                    <span className="flex items-center gap-1 text-sm font-medium">
                                        <UserRound className="size-4" />
                                        Hlavní kontakt{" "}
                                        <span className="text-red-500">*</span>
                                    </span>
                                </div>
                                <div className="relative">
                                    <Input
                                        placeholder="Jméno"
                                        value={people[0].name}
                                        onChange={(e) =>
                                            updateMainContactName(
                                                e.target.value
                                            )
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
                                                    onClick={() =>
                                                        pickClient(c)
                                                    }
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
                                    Telefonní číslo
                                </span>
                                <Input
                                    placeholder="+420 123 456 789"
                                    value={phone}
                                    onChange={(e) =>
                                        updatePhone(e.target.value)
                                    }
                                />
                                <span className="flex items-center gap-1 text-sm font-medium">
                                    <Tag className="size-4" />
                                    Služba{" "}
                                    <span className="text-red-500">*</span>
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

                                <ExtraTimeField
                                    value={people[0].extraTime}
                                    onChange={(v) =>
                                        updatePersonExtraTime(0, v)
                                    }
                                />

                                <Collapsible className="rounded-md transition-colors duration-200 data-[state=open]:bg-muted">
                                    <CollapsibleTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            className="group w-full"
                                        >
                                            <StickyNote className="size-4" />
                                            Poznámka
                                            <ChevronDownIcon className="ml-auto transition-transform duration-200 group-data-[state=open]:rotate-180" />
                                        </Button>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent className="overflow-hidden motion-safe:data-[state=closed]:animate-collapsible-up motion-safe:data-[state=open]:animate-collapsible-down">
                                        <div className="flex flex-col items-start gap-2 p-2.5 pt-0 text-sm">
                                            <Textarea
                                                value={note}
                                                onChange={(e) =>
                                                    setNote(e.target.value)
                                                }
                                            />
                                            <NoteHealthHint />
                                        </div>
                                    </CollapsibleContent>
                                </Collapsible>
                            </div>

                            {people.slice(1).map((person, i) => (
                                <div
                                    key={person.uid}
                                    className={cn(
                                        // Fades/scales in when added
                                        // (@starting-style) and out before
                                        // being removed (leavingUid).
                                        "flex origin-top flex-col gap-2 rounded-2xl border p-3 transition-[opacity,scale] duration-200 ease-out motion-reduce:transition-none starting:scale-95 starting:opacity-0",
                                        person.uid === leavingUid &&
                                            "pointer-events-none scale-95 opacity-0"
                                    )}
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
                                                onClick={() =>
                                                    removePerson(i + 1)
                                                }
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
                                            updatePersonService(
                                                i + 1,
                                                Number(v)
                                            )
                                        }
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Vyberte službu" />
                                        </SelectTrigger>
                                        <SelectContent position="popper">
                                            <SelectGroup>
                                                <SelectLabel>
                                                    Služby
                                                </SelectLabel>
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
                                    <ExtraTimeField
                                        value={person.extraTime}
                                        onChange={(v) =>
                                            updatePersonExtraTime(i + 1, v)
                                        }
                                    />
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
                        </div>
                        <div className="flex flex-col gap-3">
                            <Calendar
                                mode="single"
                                locale={cs}
                                selected={date}
                                defaultMonth={date}
                                onSelect={pickDate}
                                disabled={(day) =>
                                    localDateToUtcMidnight(day).getTime() <
                                    localDateToUtcMidnight(new Date()).getTime()
                                }
                                classNames={{
                                    outside: "text-muted-foreground opacity-50",
                                    // Tighter rows so the finger-sized time
                                    // slots below fit the fixed-height dialog.
                                    week: "mt-1 flex w-full",
                                }}
                                className="w-full bg-transparent p-0"
                            />

                            {date &&
                            people.every((p) => p.serviceId !== undefined) ? (
                                customTime ? (
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">
                                            Vlastní čas:
                                        </span>
                                        <TimePicker
                                            value={customTimeValue}
                                            onChange={pickCustomTime}
                                            defaultValue="15:00"
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
                                                size="lg"
                                                variant={
                                                    s === selectedSlot
                                                        ? "default"
                                                        : "outline"
                                                }
                                                onClick={() =>
                                                    setSelectedSlot(s)
                                                }
                                            >
                                                {formatTime(s)}
                                            </Button>
                                        ))}
                                        <Button
                                            type="button"
                                            size="lg"
                                            variant="outline"
                                            className="hover:bg-accent"
                                            onClick={() => {
                                                setCustomTime(true);
                                                setSelectedSlot(undefined);
                                            }}
                                        >
                                            <Plus className="size-4 text-primary" />
                                            Jiný
                                        </Button>
                                    </div>
                                )
                            ) : (
                                <p className="col-span-4 text-center text-sm text-muted-foreground">
                                    Vyplňte službu a datum.
                                </p>
                            )}

                            {error && (
                                <Alert variant="destructive">
                                    <AlertCircle />
                                    <AlertTitle>{error}</AlertTitle>
                                </Alert>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="-mx-6 -mb-6 border-t bg-popover px-6 py-4">
                        <Button
                            type="button"
                            variant="outline"
                            disabled={isPending}
                            onClick={() => {
                                setOpen(false);
                                reset();
                            }}
                        >
                            Zavřít
                        </Button>
                        <Button
                            type="button"
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
