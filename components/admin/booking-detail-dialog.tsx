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
} from "@/components/ui/dialog.tsx";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
    AlertDialogAction,
} from "@/components/ui/alert-dialog.tsx";
import { Calendar } from "@/components/ui/calendar.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select.tsx";
import { Alert, AlertTitle } from "@/components/ui/alert.tsx";
import { QrPayment } from "@/components/admin/qr-payment.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import {
    AlertCircle,
    Phone,
    UserRound,
    Clock,
    Check,
    X,
    Plus,
    Pencil,
    Sparkles,
    StickyNote,
    QrCode,
} from "lucide-react";
import { formatTime, toUtcMidnight, toTelHref } from "@/lib/utils.ts";
import {
    cancelBookingAction,
    getMoveSlotsAction,
    updateBookingAction,
} from "@/app/(admin)/(dashboard)/kalendar/actions.ts";
import type { BookingItem } from "@/components/admin/booking-card.tsx";
import type { Service } from "@/lib/generated/prisma/client.ts";

const SOURCE_LABELS: Record<string, string> = {
    ONLINE: "Online",
    PHONE: "Telefonicky",
    IN_PERSON: "Osobně",
};

const QR_TOTAL = "total";

type EditPerson = {
    bookingId: string;
    name: string;
    serviceId: number | undefined;
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
    const [qrTarget, setQrTarget] = useState(QR_TOTAL);
    const [qrAmount, setQrAmount] = useState("");
    const [error, setError] = useState<string>();
    const [isPending, startTransition] = useTransition();
    const [isLoadingSlots, startSlotsTransition] = useTransition();

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
        setQrTarget(QR_TOTAL);
        setQrAmount("");
        setError(undefined);
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

    function refreshEditSlots(d: Date | undefined, serviceIds: number[]) {
        setEditSlots(undefined);
        if (!d || !booking) return;
        startSlotsTransition(async () => {
            const result = await getMoveSlotsAction(
                booking.id,
                booking.groupId,
                format(d, "yyyy-MM-dd"),
                serviceIds
            );
            setEditSlots(result);
        });
    }

    function openEdit() {
        setMode("edit");
        setEditPhone(booking!.client.phone ?? "");
        setEditNote(booking!.client.note ?? "");
        const people = groupBookings.map((b) => ({
            bookingId: b.id,
            name: b.client.name,
            serviceId: b.serviceId as number | undefined,
        }));
        setEditPeople(people);
        setEditDate(booking!.date);
        setSelectedSlot(booking!.startTime);
        setCustomTime(false);
        setCustomTimeValue("");
        // Preloaded so alternative slots show right away, without the admin
        // having to touch the calendar first.
        refreshEditSlots(
            booking!.date,
            people.map((p) => p.serviceId!)
        );
    }

    function updateEditPersonService(i: number, serviceId: number) {
        const next = editPeople.map((p, idx) =>
            idx === i ? { ...p, serviceId } : p
        );
        setEditPeople(next);
        setSelectedSlot(undefined);
        setCustomTime(false);
        setCustomTimeValue("");
        refreshEditSlots(editDate, next.map((p) => p.serviceId!));
    }

    function updateEditPersonName(i: number, name: string) {
        setEditPeople((prev) =>
            prev.map((p, idx) => (idx === i ? { ...p, name } : p))
        );
    }

    function pickEditDate(d: Date | undefined) {
        setEditDate(d);
        setSelectedSlot(undefined);
        setCustomTime(false);
        setCustomTimeValue("");
        refreshEditSlots(d, editPeople.map((p) => p.serviceId!));
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
                format(booking.date, "yyyy-MM-dd") ||
            selectedSlot !== booking.startTime ||
            editPeople.some(
                (p, i) => p.serviceId !== groupBookings[i].serviceId
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
                <DialogContent className="max-h-[90svh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {mode === "detail"
                                ? "Rezervace"
                                : mode === "edit"
                                  ? "Upravit rezervaci"
                                  : "QR platba"}
                        </DialogTitle>
                    </DialogHeader>

                    {mode === "detail" ? (
                        <div className="flex flex-col gap-2 text-sm">
                            <div className="flex items-center gap-2">
                                <UserRound className="size-4 text-muted-foreground" />
                                {booking.client.name}
                                {booking.groupId && (
                                    <span className="text-muted-foreground">
                                        • Skupina
                                    </span>
                                )}
                            </div>
                            {booking.client.phone && (
                                <div className="flex items-center gap-2">
                                    <Phone className="size-4 text-muted-foreground" />
                                    <a
                                        href={toTelHref(booking.client.phone)}
                                        className="hover:underline"
                                    >
                                        {booking.client.phone}
                                    </a>
                                </div>
                            )}
                            <div className="flex items-center gap-2">
                                <Clock className="size-4 text-muted-foreground" />
                                {formatTime(booking.startTime)} –{" "}
                                {formatTime(booking.endTime)} •
                                <span className="-ms-1 text-muted-foreground">
                                    {booking.service.name}
                                </span>
                            </div>
                            <div className="text-muted-foreground">
                                {SOURCE_LABELS[booking.source]}
                            </div>
                        </div>
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
                                            {gb.client.name}
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
                        <div className="flex flex-col gap-3">
                            <div className="flex flex-col gap-2 rounded-2xl border p-3">
                                <span className="flex items-center gap-1 text-sm font-medium">
                                    <UserRound className="size-4" />
                                    {editPeople.length > 1
                                        ? "Hlavní kontakt"
                                        : "Jméno"}
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
                                    Telefonní číslo (nepovinné)
                                </span>
                                <Input
                                    placeholder="+420 123 456 789"
                                    value={editPhone}
                                    onChange={(e) =>
                                        setEditPhone(e.target.value)
                                    }
                                />
                                <span className="flex items-center gap-1 text-sm font-medium">
                                    <Sparkles className="size-4" />
                                    Služba
                                </span>
                                <Select
                                    value={
                                        editPeople[0]?.serviceId
                                            ? String(editPeople[0].serviceId)
                                            : ""
                                    }
                                    onValueChange={(v) =>
                                        updateEditPersonService(0, Number(v))
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
                                    value={editNote}
                                    onChange={(e) =>
                                        setEditNote(e.target.value)
                                    }
                                />
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
                                </div>
                            ))}

                            <Calendar
                                mode="single"
                                locale={cs}
                                selected={editDate}
                                onSelect={pickEditDate}
                                disabled={(day) =>
                                    toUtcMidnight(day).getTime() <
                                    toUtcMidnight(new Date()).getTime()
                                }
                                className="w-full bg-transparent"
                            />

                            {editDate &&
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
                                        {editSlots?.length === 0 && (
                                            <p className="col-span-4 text-center text-sm text-muted-foreground">
                                                Žádné volné termíny.
                                            </p>
                                        )}
                                        {editSlots?.map((s) => (
                                            <Button
                                                key={s}
                                                type="button"
                                                size="sm"
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
                    )}

                    <DialogFooter
                        className={
                            mode === "detail"
                                ? "flex-row flex-wrap justify-between gap-2 sm:flex-nowrap sm:justify-start"
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
                                        selectedSlot === undefined || isPending
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
                            {booking.client.name} •{" "}
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
                            Měníš termín nebo službu rezervace. Klient se o
                            téhle změně automaticky nedozví — nepošle se mu
                            žádný email, SMS ani push. Pokud potřebuje vědět,
                            dej mu vědět sama.
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
