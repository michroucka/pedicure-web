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
import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
    InputGroupText,
} from "@/components/ui/input-group.tsx";
import { Alert, AlertTitle } from "@/components/ui/alert.tsx";
import {
    AlertCircle,
    Phone,
    UserRound,
    Clock,
    Check,
    X,
    Plus,
    ArrowRightLeft,
    QrCode,
} from "lucide-react";
import {
    formatTime,
    toUtcMidnight,
    normalizePhoneForMatch,
    toTelHref,
} from "@/lib/utils.ts";
import {
    cancelBookingAction,
    getMoveSlotsAction,
    moveBookingAction,
} from "@/app/(admin)/(dashboard)/kalendar/actions.ts";
import type { BookingItem } from "@/components/admin/booking-card.tsx";

const SOURCE_LABELS: Record<string, string> = {
    ONLINE: "Online",
    PHONE: "Telefonicky",
    IN_PERSON: "Osobně",
};

const QR_TOTAL = "total";

export function BookingDetailDialog({
    booking,
    allBookings,
    onOpenChange,
}: {
    booking: BookingItem | null;
    allBookings: BookingItem[];
    onOpenChange: (open: boolean) => void;
}) {
    const [mode, setMode] = useState<"detail" | "move" | "qr">("detail");
    const [confirmCancel, setConfirmCancel] = useState(false);
    const [moveDate, setMoveDate] = useState<Date>();
    const [moveSlots, setMoveSlots] = useState<number[]>();
    const [selectedSlot, setSelectedSlot] = useState<number>();
    const [customTime, setCustomTime] = useState(false);
    const [customTimeValue, setCustomTimeValue] = useState("");
    const [qrTarget, setQrTarget] = useState(QR_TOTAL);
    const [qrAmount, setQrAmount] = useState("");
    const [error, setError] = useState<string>();
    const [isPending, startTransition] = useTransition();

    function reset() {
        setMode("detail");
        setConfirmCancel(false);
        setMoveDate(undefined);
        setMoveSlots(undefined);
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
                : (groupBookings.find((b) => b.id === target)?.service
                      .price ?? 0);
        setQrAmount(String(amount));
    }

    const qrMessage =
        qrTarget === QR_TOTAL
            ? groupBookings[0].client.name
            : (groupBookings.find((b) => b.id === qrTarget)?.client.name ??
              groupBookings[0].client.name);

    const qrAmountValue = Number(qrAmount);
    const qrUrl =
        qrAmountValue > 0
            ? `https://api.paylibo.com/paylibo/generator/czech/image?${new URLSearchParams(
                  {
                      accountNumber: process.env.NEXT_PUBLIC_BANK_ACCOUNT ?? "",
                      bankCode: process.env.NEXT_PUBLIC_BANK_CODE ?? "",
                      amount: qrAmount,
                      currency: "CZK",
                      vs: normalizePhoneForMatch(booking.client.phone),
                      message: qrMessage,
                      size: "300",
                      branding: "false",
                  }
              ).toString()}`
            : undefined;

    function pickMoveDate(d: Date | undefined) {
        setMoveDate(d);
        setSelectedSlot(undefined);
        setMoveSlots(undefined);
        setCustomTime(false);
        setCustomTimeValue("");
        if (!d || !booking) return;
        startTransition(async () => {
            const slots = await getMoveSlotsAction(
                booking.id,
                booking.groupId,
                format(d, "yyyy-MM-dd")
            );
            setMoveSlots(slots);
        });
    }

    function confirmMove() {
        if (!booking || !moveDate || selectedSlot === undefined) return;
        startTransition(async () => {
            const result = await moveBookingAction(
                booking.id,
                booking.groupId,
                format(moveDate, "yyyy-MM-dd"),
                selectedSlot,
                customTime
            );
            if (!result.ok) {
                setError(result.error);
                return;
            }
            close();
        });
    }

    function doCancel() {
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
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {mode === "detail"
                                ? "Rezervace"
                                : mode === "move"
                                  ? "Přesunout rezervaci"
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
                            <div className="flex items-center gap-2">
                                <Phone className="size-4 text-muted-foreground" />
                                <a
                                    href={toTelHref(booking.client.phone)}
                                    className="hover:underline"
                                >
                                    {booking.client.phone}
                                </a>
                            </div>
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
                                        onClick={() =>
                                            selectQrTarget(QR_TOTAL)
                                        }
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

                            {qrUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element -- dynamic external QR image, no benefit from next/image
                                <img
                                    src={qrUrl}
                                    alt="QR platba"
                                    className="mx-auto rounded-lg border"
                                    width={240}
                                    height={240}
                                />
                            ) : (
                                <div
                                    className="mx-auto flex items-center justify-center rounded-lg border text-center text-sm text-muted-foreground"
                                    style={{ width: 240, height: 240 }}
                                >
                                    Zadejte částku.
                                </div>
                            )}

                            <div className="flex items-center justify-center gap-2">
                                <span className="font-medium">Částka:</span>
                                <InputGroup className="w-auto max-w-32">
                                    <InputGroupInput
                                        type="number"
                                        inputMode="numeric"
                                        value={qrAmount}
                                        onChange={(e) =>
                                            setQrAmount(e.target.value)
                                        }
                                        onFocus={(e) => e.target.select()}
                                    />
                                    <InputGroupAddon align="inline-end">
                                        <InputGroupText>Kč</InputGroupText>
                                    </InputGroupAddon>
                                </InputGroup>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            <Calendar
                                mode="single"
                                locale={cs}
                                selected={moveDate}
                                onSelect={pickMoveDate}
                                disabled={(day) =>
                                    toUtcMidnight(day).getTime() <
                                    toUtcMidnight(new Date()).getTime()
                                }
                                className="w-full bg-transparent"
                            />

                            {moveDate &&
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
                                ) : (
                                    <div className="grid grid-cols-4 gap-2">
                                        {moveSlots?.length === 0 && (
                                            <p className="col-span-4 text-center text-sm text-muted-foreground">
                                                Žádné volné termíny.
                                            </p>
                                        )}
                                        {moveSlots?.map((s) => (
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
                                    onClick={() => setMode("move")}
                                >
                                    <ArrowRightLeft className="size-4" />
                                    Přesunout
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
                                    onClick={confirmMove}
                                >
                                    <Check className="size-4" />
                                    {isPending
                                        ? "Přesouvám…"
                                        : "Potvrdit přesun"}
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
                            Zrušit rezervaci
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
