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
import { Alert, AlertTitle } from "@/components/ui/alert.tsx";
import {
    AlertCircle,
    Phone,
    UserRound,
    Clock,
    Check,
    X,
    ArrowRightLeft,
} from "lucide-react";
import { formatTime, toUtcMidnight } from "@/lib/utils.ts";
import {
    cancelBookingAction,
    getMoveSlotsAction,
    moveBookingAction,
} from "@/app/admin/(dashboard)/actions.ts";
import type { BookingItem } from "@/components/admin/booking-card.tsx";

const SOURCE_LABELS: Record<string, string> = {
    ONLINE: "Online",
    PHONE: "Telefonicky",
    IN_PERSON: "Osobně",
};

export function BookingDetailDialog({
    booking,
    onOpenChange,
}: {
    booking: BookingItem | null;
    onOpenChange: (open: boolean) => void;
}) {
    const [mode, setMode] = useState<"detail" | "move">("detail");
    const [confirmCancel, setConfirmCancel] = useState(false);
    const [moveDate, setMoveDate] = useState<Date>();
    const [moveSlots, setMoveSlots] = useState<number[]>();
    const [selectedSlot, setSelectedSlot] = useState<number>();
    const [error, setError] = useState<string>();
    const [isPending, startTransition] = useTransition();

    function reset() {
        setMode("detail");
        setConfirmCancel(false);
        setMoveDate(undefined);
        setMoveSlots(undefined);
        setSelectedSlot(undefined);
        setError(undefined);
    }

    function close() {
        reset();
        onOpenChange(false);
    }

    if (!booking) return null;

    function pickMoveDate(d: Date | undefined) {
        setMoveDate(d);
        setSelectedSlot(undefined);
        setMoveSlots(undefined);
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
                selectedSlot
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
                                : "Přesunout rezervaci"}
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
                                {booking.client.phone}
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

                            {moveDate && (
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
                                            onClick={() => setSelectedSlot(s)}
                                        >
                                            {formatTime(s)}
                                        </Button>
                                    ))}
                                </div>
                            )}

                            {error && (
                                <Alert variant="destructive">
                                    <AlertCircle />
                                    <AlertTitle>{error}</AlertTitle>
                                </Alert>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        {mode === "detail" ? (
                            <>
                                <Button
                                    type="button"
                                    variant="destructive"
                                    onClick={() => setConfirmCancel(true)}
                                >
                                    <X className="size-4" />
                                    Zrušit
                                </Button>
                                <Button
                                    type="button"
                                    onClick={() => setMode("move")}
                                >
                                    <ArrowRightLeft className="size-4" />
                                    Přesunout
                                </Button>
                            </>
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
                            {formatTime(booking.startTime)}–
                            {formatTime(booking.endTime)}. Tuhle akci nejde vzít
                            zpět.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Zpět</AlertDialogCancel>
                        <AlertDialogAction
                            disabled={isPending}
                            onClick={doCancel}
                        >
                            Zrušit rezervaci
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
