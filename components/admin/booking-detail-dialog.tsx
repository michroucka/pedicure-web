"use client";

import { useState, useTransition, type MouseEvent } from "react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
    AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TimePicker } from "@/components/ui/time-picker";
import { TIME_PICKER_COMMIT_DELAY_MS } from "@/lib/time-picker-commit-delay";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { QrPayment } from "@/components/admin/qr-payment";
import { Spinner } from "@/components/ui/spinner";
import {
    AlertCircle,
    Phone,
    UserRound,
    Check,
    X,
    Plus,
    Pencil,
    StickyNote,
    QrCode,
    ChevronDownIcon,
    Globe,
    CalendarClock,
    Tag,
    PhoneCall,
    Handshake,
    Mail,
    type LucideIcon,
} from "lucide-react";
import {
    cn,
    formatPhoneNumber,
    formatTime,
    localDateToUtcMidnight,
    toTelHref,
} from "@/lib/utils";
import {
    cancelBookingAction,
    getMoveSlotsAction,
    updateBookingAction,
} from "@/app/(admin)/(dashboard)/kalendar/actions";
import type { BookingItem } from "@/components/admin/booking-card";
import type { Service } from "@/lib/generated/prisma/client";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
    ExtraTimeField,
    extraTimeFromMinutes,
    extraTimeToMinutes,
    type ExtraTime,
} from "@/components/admin/extra-time-field";
import { getBookingPersonName } from "@/lib/get-booking-person-name";
import { NoteHealthHint } from "@/components/admin/note-health-hint";

const SOURCE_LABELS: Record<string, { label: string; icon: LucideIcon }> = {
    ONLINE: { label: "Rezervace online", icon: Globe },
    PHONE: { label: "Rezervace telefonicky", icon: PhoneCall },
    IN_PERSON: { label: "Rezervace osobně", icon: Handshake },
};

const QR_TOTAL = "total";

type EditPerson = {
    bookingId: string;
    name: string;
    serviceId: number | undefined;
    extraTime: ExtraTime;
};

export function BookingDetailDialog({
    booking,
    allBookings,
    services,
    onOpenChange,
}: {
    booking: BookingItem | null;
    allBookings: BookingItem[];
    services: Service[];
    onOpenChange: (open: boolean) => void;
}) {
    const [mode, setMode] = useState<"detail" | "edit" | "qr">("detail");
    const [confirmCancel, setConfirmCancel] = useState(false);
    const [confirmSave, setConfirmSave] = useState(false);
    const [editPhone, setEditPhone] = useState("");
    const [editNote, setEditNote] = useState("");
    const [editPeople, setEditPeople] = useState<EditPerson[]>([]);
    const [editDate, setEditDate] = useState<Date>();
    const [editSlots, setEditSlots] = useState<number[]>();
    const [selectedSlot, setSelectedSlot] = useState<number>();
    const [customTime, setCustomTime] = useState(false);
    const [customTimeValue, setCustomTimeValue] = useState("");
    // The time that was picked before a change of service / extra time /
    // date, when it no longer fits – said out loud instead of silently
    // dropping it.
    const [lostSlot, setLostSlot] = useState<number>();
    const [qrTarget, setQrTarget] = useState(QR_TOTAL);
    const [qrAmount, setQrAmount] = useState("");
    const [error, setError] = useState<string>();
    const [isPending, startTransition] = useTransition();
    const [isLoadingSlots, startSlotsTransition] = useTransition();
    const [isNoteOpen, setIsNoteOpen] = useState(false);

    function reset() {
        setMode("detail");
        setConfirmCancel(false);
        setConfirmSave(false);
        setEditPhone("");
        setEditNote("");
        setEditPeople([]);
        setEditDate(undefined);
        setEditSlots(undefined);
        setSelectedSlot(undefined);
        setCustomTime(false);
        setCustomTimeValue("");
        setLostSlot(undefined);
        setQrTarget(QR_TOTAL);
        setQrAmount("");
        setError(undefined);
        setIsNoteOpen(false);
    }

    function pickCustomTime(value: string) {
        setCustomTimeValue(value);
        const [h, m] = value.split(":").map(Number);
        setSelectedSlot(
            Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : undefined
        );
    }

    function close() {
        reset();
        onOpenChange(false);
    }

    if (!booking) return null;

    const groupBookings = booking.groupId
        ? allBookings
              .filter((b) => b.groupId === booking.groupId)
              .sort((a, b) => a.startTime - b.startTime)
        : [booking];
    // Editing always acts on the whole group, so its schedule is anchored to
    // the group's first booking – not to whichever member was clicked
    // (clicking the 2nd person must still preselect/compare the group's
    // start, or saving would shift the whole group to that person's time).
    // Same for contact details: they belong to the main contact.
    const groupStart = groupBookings[0];

    function openQr() {
        setMode("qr");
        selectQrTarget(QR_TOTAL);
    }

    function selectQrTarget(target: string) {
        setQrTarget(target);
        const amount =
            target === QR_TOTAL
                ? groupBookings.reduce((sum, b) => sum + b.service.price, 0)
                : (groupBookings.find((b) => b.id === target)?.service.price ??
                  0);
        setQrAmount(String(amount));
    }

    // `keepSlot`: the time picked so far – stays picked if it's still free
    // with the new date/length (the edited bookings don't block their own
    // time), otherwise it's reported as lost.
    function refreshEditSlots(
        d: Date | undefined,
        people: EditPerson[],
        keepSlot?: number
    ) {
        setEditSlots(undefined);
        setLostSlot(undefined);
        if (!d || !booking) return;
        startSlotsTransition(async () => {
            const result = await getMoveSlotsAction(
                booking.id,
                booking.groupId,
                format(d, "yyyy-MM-dd"),
                people.map((p) => p.serviceId!),
                people.map((p) => extraTimeToMinutes(p.extraTime))
            );
            setEditSlots(result);
            if (keepSlot === undefined) return;
            if (result.includes(keepSlot)) {
                setSelectedSlot(keepSlot);
            } else {
                setSelectedSlot(undefined);
                setLostSlot(keepSlot);
            }
        });
    }

    // A custom ("Jiný") time is kept as it is – it's meant to be outside
    // the offered slots. Otherwise the picked slot is re-checked.
    function refreshKeepingTime(d: Date | undefined, people: EditPerson[]) {
        if (customTime) {
            refreshEditSlots(d, people);
        } else {
            refreshEditSlots(d, people, selectedSlot);
        }
    }

    function openEdit() {
        setMode("edit");
        setEditPhone(groupStart.client.phone ?? "");
        if (groupStart.client.note) setIsNoteOpen(true);
        setEditNote(groupStart.client.note ?? "");
        const people = groupBookings.map((b) => ({
            bookingId: b.id,
            name: getBookingPersonName(b),
            serviceId: b.serviceId as number | undefined,
            extraTime: extraTimeFromMinutes(b.extraTimeMinutes),
        }));
        setEditPeople(people);
        setEditDate(groupStart.date);
        setSelectedSlot(groupStart.startTime);
        setCustomTime(false);
        setCustomTimeValue("");
        // Preloaded so alternative slots show right away, without the admin
        // having to touch the calendar first.
        refreshEditSlots(groupStart.date, people);
    }

    function updateEditPersonService(i: number, serviceId: number) {
        const next = editPeople.map((p, idx) =>
            idx === i ? { ...p, serviceId } : p
        );
        setEditPeople(next);
        refreshKeepingTime(editDate, next);
    }

    function updateEditPersonExtraTime(i: number, extraTime: ExtraTime) {
        const next = editPeople.map((p, idx) =>
            idx === i ? { ...p, extraTime } : p
        );
        setEditPeople(next);
        refreshKeepingTime(editDate, next);
    }

    function updateEditPersonName(i: number, name: string) {
        setEditPeople((prev) =>
            prev.map((p, idx) => (idx === i ? { ...p, name } : p))
        );
    }

    function pickEditDate(d: Date | undefined) {
        setEditDate(d);
        refreshKeepingTime(d, editPeople);
    }

    function submitEdit() {
        setError(undefined);

        if (!booking) return;
        if (editPeople.some((p) => !p.name.trim() || !p.serviceId)) {
            setError("Vyplňte jméno a službu pro každou osobu.");
            return;
        }
        if (!editDate || selectedSlot === undefined) {
            setError("Vyberte datum a čas.");
            return;
        }

        const scheduleChanged =
            format(editDate, "yyyy-MM-dd") !==
                format(groupStart.date, "yyyy-MM-dd") ||
            selectedSlot !== groupStart.startTime ||
            editPeople.some(
                (p, i) =>
                    p.serviceId !== groupBookings[i].serviceId ||
                    extraTimeToMinutes(p.extraTime) !==
                        groupBookings[i].extraTimeMinutes
            );

        if (scheduleChanged) {
            setConfirmSave(true);
            return;
        }
        doSaveEdit();
    }

    function doSaveEdit() {
        if (!editDate || selectedSlot === undefined) return;
        startTransition(async () => {
            const result = await updateBookingAction({
                groupId: booking!.groupId,
                people: editPeople.map((p) => ({
                    bookingId: p.bookingId,
                    name: p.name.trim(),
                    serviceId: p.serviceId!,
                    extraTimeMinutes: extraTimeToMinutes(p.extraTime),
                })),
                phone: editPhone.trim(),
                note: editNote.trim(),
                dateStr: format(editDate, "yyyy-MM-dd"),
                startTime: selectedSlot,
                outsideHours: customTime,
            });
            if (!result.ok) {
                setConfirmSave(false);
                setError(result.error);
                return;
            }
            close();
        });
    }

    function doCancel(e: MouseEvent) {
        e.preventDefault();
        startTransition(async () => {
            await cancelBookingAction(booking!.id);
            close();
        });
    }

    return (
        <>
            <Dialog
                open={!!booking}
                onOpenChange={(open) => !open && close()}
            >
                <DialogContent
                    className={cn(
                        "max-h-[90svh] overflow-y-auto",
                        // Tablet: person on the left, date and time on the
                        // right - everything in view without scrolling.
                        // Fixed height, so ticking "Čas navíc", opening the
                        // note or "Jiný" time, or a day with more slots
                        // doesn't make the dialog jump; the body scrolls
                        // instead and the footer stays at the bottom.
                        mode === "edit" &&
                            "h-[90svh] grid-rows-[auto_1fr_auto] overflow-y-hidden md:h-[min(90svh,46rem)] md:max-w-3xl"
                    )}
                >
                    <DialogHeader>
                        <DialogTitle>
                            {mode === "detail"
                                ? getBookingPersonName(booking)
                                : mode === "edit"
                                  ? "Upravit rezervaci"
                                  : "QR platba"}
                        </DialogTitle>
                        {mode === "edit" && (
                            <EditScheduleSummary
                                current={{
                                    date: groupStart.date,
                                    start: groupStart.startTime,
                                    end: groupBookings.at(-1)!.endTime,
                                }}
                                edited={
                                    editDate && selectedSlot !== undefined
                                        ? {
                                              date: editDate,
                                              start: selectedSlot,
                                              end:
                                                  selectedSlot +
                                                  editedDurationMinutes(
                                                      editPeople,
                                                      services
                                                  ),
                                          }
                                        : undefined
                                }
                            />
                        )}
                    </DialogHeader>

                    {mode === "detail" ? (
                        <BookingDetailInfo booking={booking} />
                    ) : mode === "qr" ? (
                        <div className="flex flex-col gap-5">
                            {groupBookings.length > 1 && (
                                <div
                                    className="grid gap-2"
                                    style={{
                                        gridTemplateColumns: `repeat(${groupBookings.length + 1}, minmax(0, 1fr))`,
                                    }}
                                >
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={
                                            qrTarget === QR_TOTAL
                                                ? "default"
                                                : "outline"
                                        }
                                        onClick={() => selectQrTarget(QR_TOTAL)}
                                    >
                                        Celkem
                                    </Button>
                                    {groupBookings.map((gb) => (
                                        <Button
                                            key={gb.id}
                                            type="button"
                                            size="sm"
                                            variant={
                                                qrTarget === gb.id
                                                    ? "default"
                                                    : "outline"
                                            }
                                            onClick={() =>
                                                selectQrTarget(gb.id)
                                            }
                                        >
                                            {getBookingPersonName(gb)}
                                        </Button>
                                    ))}
                                </div>
                            )}

                            <QrPayment
                                amount={qrAmount}
                                onAmountChange={setQrAmount}
                            />
                        </div>
                    ) : (
                        <div className="-mx-6 flex min-h-0 scrollbar-gutter-stable flex-col gap-3 overflow-y-auto px-6 md:grid md:grid-cols-2 md:items-start md:gap-6">
                            <div className="flex flex-col gap-3">
                                <div className="flex flex-col gap-2 rounded-2xl border p-3">
                                    <span className="flex items-center gap-1 text-sm font-medium">
                                        <UserRound className="size-4" />
                                        {editPeople.length > 1
                                            ? "Hlavní kontakt"
                                            : "Jméno"}
                                        <span className="text-red-500">*</span>
                                    </span>
                                    <Input
                                        placeholder="Jméno"
                                        value={editPeople[0]?.name ?? ""}
                                        onChange={(e) =>
                                            updateEditPersonName(
                                                0,
                                                e.target.value
                                            )
                                        }
                                    />
                                    <span className="flex items-center gap-1 text-sm font-medium">
                                        <Phone className="size-4" />
                                        Telefonní číslo
                                    </span>
                                    <Input
                                        placeholder="+420 123 456 789"
                                        value={editPhone}
                                        onChange={(e) =>
                                            setEditPhone(
                                                formatPhoneNumber(
                                                    e.target.value
                                                )
                                            )
                                        }
                                    />
                                    <span className="flex items-center gap-1 text-sm font-medium">
                                        <Tag className="size-4" />
                                        Služba{" "}
                                        <span className="text-red-500">*</span>
                                    </span>
                                    <Select
                                        value={
                                            editPeople[0]?.serviceId
                                                ? String(
                                                      editPeople[0].serviceId
                                                  )
                                                : ""
                                        }
                                        onValueChange={(v) =>
                                            updateEditPersonService(
                                                0,
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
                                        value={
                                            editPeople[0]?.extraTime ??
                                            extraTimeFromMinutes(0)
                                        }
                                        onChange={(v) =>
                                            updateEditPersonExtraTime(0, v)
                                        }
                                    />

                                    <Collapsible
                                        open={isNoteOpen}
                                        onOpenChange={setIsNoteOpen}
                                        className="rounded-md transition-colors duration-200 data-[state=open]:bg-muted"
                                    >
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
                                                    value={editNote}
                                                    onChange={(e) =>
                                                        setEditNote(
                                                            e.target.value
                                                        )
                                                    }
                                                />
                                                <NoteHealthHint />
                                            </div>
                                        </CollapsibleContent>
                                    </Collapsible>
                                </div>

                                {editPeople.slice(1).map((person, i) => (
                                    <div
                                        key={person.bookingId}
                                        className="flex flex-col gap-2 rounded-2xl border p-3"
                                    >
                                        <span className="flex items-center gap-1 text-sm font-medium">
                                            <UserRound className="size-4" />
                                            Osoba {i + 2}
                                        </span>
                                        <Input
                                            placeholder="Jméno"
                                            value={person.name}
                                            onChange={(e) =>
                                                updateEditPersonName(
                                                    i + 1,
                                                    e.target.value
                                                )
                                            }
                                        />
                                        <Select
                                            value={
                                                person.serviceId
                                                    ? String(person.serviceId)
                                                    : ""
                                            }
                                            onValueChange={(v) =>
                                                updateEditPersonService(
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
                                                updateEditPersonExtraTime(
                                                    i + 1,
                                                    v
                                                )
                                            }
                                        />
                                    </div>
                                ))}
                            </div>
                            <div className="flex flex-col gap-3">
                                <Calendar
                                    mode="single"
                                    locale={cs}
                                    selected={editDate}
                                    onSelect={pickEditDate}
                                    disabled={(day) =>
                                        localDateToUtcMidnight(day).getTime() <
                                        localDateToUtcMidnight(
                                            new Date()
                                        ).getTime()
                                    }
                                    classNames={{
                                        outside:
                                            "text-muted-foreground opacity-50",
                                        // Tighter rows (default mt-2) so the
                                        // finger-sized time slots below still
                                        // fit the fixed-height dialog.
                                        week: "mt-1 flex w-full",
                                    }}
                                    className="w-full bg-transparent p-0"
                                />

                                {editDate &&
                                    (customTime ? (
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">
                                                Vlastní čas:
                                            </span>
                                            <TimePicker
                                                commitDelay={
                                                    TIME_PICKER_COMMIT_DELAY_MS
                                                }
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
                                        (() => {
                                            const sameDate =
                                                editDate?.getTime() ===
                                                groupStart.date.getTime();
                                            const displaySlots =
                                                sameDate &&
                                                editSlots &&
                                                !editSlots.includes(
                                                    groupStart.startTime
                                                )
                                                    ? [
                                                          ...editSlots,
                                                          groupStart.startTime,
                                                      ].sort((a, b) => a - b)
                                                    : editSlots;
                                            return (
                                                <div className="grid grid-cols-4 gap-2">
                                                    {displaySlots?.length ===
                                                        0 && (
                                                        <p className="col-span-4 text-center text-sm text-muted-foreground">
                                                            Žádné volné termíny.
                                                        </p>
                                                    )}
                                                    {displaySlots?.map((s) => (
                                                        <Button
                                                            key={s}
                                                            type="button"
                                                            size="lg"
                                                            variant={
                                                                s ===
                                                                selectedSlot
                                                                    ? "default"
                                                                    : "outline"
                                                            }
                                                            onClick={() => {
                                                                setSelectedSlot(
                                                                    s
                                                                );
                                                                setLostSlot(
                                                                    undefined
                                                                );
                                                            }}
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
                                                            setSelectedSlot(
                                                                undefined
                                                            );
                                                            setLostSlot(
                                                                undefined
                                                            );
                                                        }}
                                                    >
                                                        <Plus className="size-4 text-primary" />
                                                        Jiný
                                                    </Button>
                                                </div>
                                            );
                                        })()
                                    ))}

                                {lostSlot !== undefined && (
                                    <Alert variant="warning">
                                        <AlertCircle />
                                        <AlertTitle>
                                            {`Čas ${formatTime(lostSlot)} už není volný, vyberte jiný.`}
                                        </AlertTitle>
                                    </Alert>
                                )}

                                {error && (
                                    <Alert variant="destructive">
                                        <AlertCircle />
                                        <AlertTitle>{error}</AlertTitle>
                                    </Alert>
                                )}
                            </div>
                        </div>
                    )}

                    <DialogFooter
                        className={
                            mode === "detail"
                                ? "flex-row flex-wrap justify-between gap-2 sm:flex-nowrap sm:justify-start"
                                : mode === "edit"
                                  ? // Own row under the scrolling body, so
                                    // "Uložit" never needs scrolling to.
                                    "-mx-6 -mb-6 border-t bg-popover px-6 py-4"
                                  : undefined
                        }
                    >
                        {mode === "detail" ? (
                            <>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="order-1 mb-2 w-full sm:order-2 sm:mb-0 sm:ml-auto sm:w-auto"
                                    onClick={openQr}
                                >
                                    <QrCode className="size-4" />
                                    QR platba
                                </Button>
                                <Button
                                    type="button"
                                    variant="destructive"
                                    className="order-2 sm:order-1"
                                    onClick={() => setConfirmCancel(true)}
                                >
                                    <X className="size-4" />
                                    Zrušit
                                </Button>
                                <Button
                                    type="button"
                                    className="order-3"
                                    onClick={openEdit}
                                >
                                    <Pencil className="size-4" />
                                    Upravit
                                </Button>
                            </>
                        ) : mode === "qr" ? (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setMode("detail")}
                            >
                                Zpět
                            </Button>
                        ) : (
                            <>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setMode("detail")}
                                >
                                    Zpět
                                </Button>
                                <Button
                                    type="button"
                                    disabled={
                                        selectedSlot === undefined ||
                                        isPending ||
                                        isLoadingSlots
                                    }
                                    onClick={submitEdit}
                                >
                                    {isPending ? (
                                        <Spinner className="size-4" />
                                    ) : (
                                        <Check className="size-4" />
                                    )}
                                    {isPending ? "Ukládám…" : "Uložit"}
                                </Button>
                            </>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog
                open={confirmCancel}
                onOpenChange={setConfirmCancel}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Zrušit rezervaci?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {getBookingPersonName(booking)} •{" "}
                            {formatTime(booking.startTime)} –{" "}
                            {formatTime(booking.endTime)}. Tuto akci nelze vzít
                            zpět.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Zpět</AlertDialogCancel>
                        <AlertDialogAction
                            disabled={isPending}
                            onClick={doCancel}
                            variant="destructive"
                        >
                            {isPending ? (
                                <Spinner className="size-4" />
                            ) : (
                                <X className="size-4" />
                            )}
                            {isPending ? "Ruším…" : "Zrušit rezervaci"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog
                open={confirmSave}
                onOpenChange={setConfirmSave}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Uložit změny?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {/* Only online bookings get the "moved" email –
                            mirrors updateBookingAction. */}
                            {groupStart.source === "ONLINE"
                                ? "Měníš termín, službu nebo délku rezervace. Klientovi přijde e-mail s novým termínem a novým odkazem pro správu rezervace."
                                : "Měníš termín, službu nebo délku rezervace. Klient se o téhle změně automaticky nedozví."}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Zpět</AlertDialogCancel>
                        <AlertDialogAction
                            disabled={isPending}
                            onClick={doSaveEdit}
                        >
                            {isPending ? (
                                <Spinner className="size-4" />
                            ) : (
                                <Check className="size-4" />
                            )}
                            {isPending ? "Ukládám…" : "Uložit změny"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

// Read-only summary (the client's name is the dialog title): contact in
// small print, the term as the main line - with the date, as the dialog
// opens from any week - then the client's note, and how it was booked last.
function editedDurationMinutes(people: EditPerson[], services: Service[]) {
    return people.reduce(
        (sum, p) =>
            sum +
            (services.find((s) => s.id === p.serviceId)?.durationMinutes ?? 0) +
            extraTimeToMinutes(p.extraTime),
        0
    );
}

type Schedule = { date: Date; start: number; end: number };

function formatSchedule({ date, start, end }: Schedule) {
    return `${format(date, "EEEE d. MMMM", { locale: cs })}, ${formatTime(start)}–${formatTime(end)}`;
}

// Always in view while editing, so changing the length or the day never
// leaves the admin guessing what the booking was.
function EditScheduleSummary({
    current,
    edited,
}: {
    current: Schedule;
    edited: Schedule | undefined;
}) {
    const isChanged =
        edited !== undefined &&
        (format(edited.date, "yyyy-MM-dd") !==
            format(current.date, "yyyy-MM-dd") ||
            edited.start !== current.start ||
            edited.end !== current.end);
    return (
        <div className="text-sm text-muted-foreground">
            <div className={cn(isChanged && "line-through")}>
                {formatSchedule(current)}
            </div>
            {isChanged && (
                <div className="font-medium text-foreground">
                    {formatSchedule(edited)}
                </div>
            )}
        </div>
    );
}

function BookingDetailInfo({ booking }: { booking: BookingItem }) {
    const source = SOURCE_LABELS[booking.source];
    const SourceIcon = source.icon;
    const hasContact = booking.client.phone || booking.client.email;
    // Every icon the same size and gap, so all the text lines up in one
    // column.
    const iconClassName = "size-4 shrink-0 text-muted-foreground";

    return (
        <div className="flex flex-col gap-4 text-sm">
            {(hasContact || booking.groupId) && (
                <div className="-mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
                    {booking.groupId && <span>Skupina</span>}
                    {booking.client.phone && (
                        <a
                            href={toTelHref(booking.client.phone)}
                            className="inline-flex items-center gap-2 hover:text-foreground"
                        >
                            <Phone className={iconClassName} />
                            {booking.client.phone}
                        </a>
                    )}
                    {booking.client.email && (
                        <a
                            href={`mailto:${booking.client.email}`}
                            className="inline-flex min-w-0 items-center gap-2 hover:text-foreground"
                        >
                            <Mail className={iconClassName} />
                            <span className="truncate">
                                {booking.client.email}
                            </span>
                        </a>
                    )}
                </div>
            )}

            <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                    <CalendarClock className={iconClassName} />
                    <p className="text-base font-medium">
                        {format(booking.date, "EEEEEE d. M.", { locale: cs })} ·{" "}
                        {formatTime(booking.startTime)} –{" "}
                        {formatTime(booking.endTime)}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Tag className={iconClassName} />
                    <p>
                        {booking.service.name}
                        <span className="text-muted-foreground">
                            {" "}
                            · {booking.service.price.toLocaleString("cs-CZ")} Kč
                        </span>
                    </p>
                </div>
            </div>

            {booking.client.note && (
                <div className="flex gap-2">
                    <StickyNote className={`${iconClassName} mt-0.5`} />
                    <p className="whitespace-pre-line">{booking.client.note}</p>
                </div>
            )}

            <p className="flex items-center gap-2 text-muted-foreground">
                <SourceIcon className={iconClassName} />
                {source.label}
            </p>
        </div>
    );
}
