"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addDays, format, startOfDay } from "date-fns";
import { cs } from "date-fns/locale";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import {
    AlertCircle,
    ArrowRightLeft,
    Check,
    ChevronLeft,
    Info,
    X,
} from "lucide-react";
import { canClientModifyBooking } from "@/lib/booking-modification-window";
import { formatTime, localDateToUtcMidnight } from "@/lib/utils";
import { HORIZON_DAYS } from "@/lib/booking-horizon";
import {
    cancelBookingByTokenAction,
    getRescheduleDaysAction,
    getRescheduleSlotsAction,
    moveBookingByTokenAction,
} from "@/app/rezervace/sprava/[token]/actions";
import { CzechText } from "@/components/czech-text";

export function ManageBooking({
    token,
    serviceLabel,
    dateLabel,
    startTime,
    durationMinutes,
}: {
    token: string;
    serviceLabel: string;
    dateLabel: string;
    startTime: number;
    durationMinutes: number;
}) {
    const router = useRouter();
    const [mode, setMode] = useState<"idle" | "move">("idle");
    const [confirmCancel, setConfirmCancel] = useState(false);
    const [availableDays, setAvailableDays] = useState<Date[]>();
    const [moveDate, setMoveDate] = useState<Date>();
    const [moveSlots, setMoveSlots] = useState<number[]>();
    const [selectedSlot, setSelectedSlot] = useState<number>();
    const [error, setError] = useState<string>();
    const [isPending, startTransition] = useTransition();
    const [isLoadingSlots, startSlotsTransition] = useTransition();
    const [isLoadingDays, startDaysTransition] = useTransition();

    function openMove() {
        setMode("move");
        if (availableDays !== undefined) return;
        const tomorrow = localDateToUtcMidnight(
            addDays(startOfDay(new Date()), 1)
        );
        const horizonEnd = addDays(tomorrow, HORIZON_DAYS);
        startDaysTransition(async () => {
            const days = await getRescheduleDaysAction(token, {
                from: tomorrow,
                to: horizonEnd,
            });
            setAvailableDays(days);
        });
    }

    function pickMoveDate(d: Date | undefined) {
        setMoveDate(d);
        setSelectedSlot(undefined);
        setMoveSlots(undefined);
        if (!d) return;
        startSlotsTransition(async () => {
            const slots = await getRescheduleSlotsAction(
                token,
                format(d, "yyyy-MM-dd")
            );
            setMoveSlots(slots);
        });
    }

    function confirmMove() {
        if (!moveDate || selectedSlot === undefined) return;
        setError(undefined);
        startTransition(async () => {
            const result = await moveBookingByTokenAction(
                token,
                format(moveDate, "yyyy-MM-dd"),
                selectedSlot
            );
            if (!result.ok) {
                setError(result.error);
                return;
            }
            router.push(`/rezervace/sprava/${result.newToken}?moved=1`);
        });
    }

    function doCancel() {
        startTransition(async () => {
            const result = await cancelBookingByTokenAction(token);
            if (!result.ok) {
                setError(result.error);
                setConfirmCancel(false);
                return;
            }
            router.refresh();
        });
    }

    if (mode === "move") {
        const movesIntoLockedWindow =
            moveDate !== undefined &&
            selectedSlot !== undefined &&
            !canClientModifyBooking(
                localDateToUtcMidnight(moveDate),
                selectedSlot
            );
        const availableDaySet = new Set(
            (availableDays ?? []).map((d) => d.getTime())
        );

        return (
            <CzechText>
                {/* data-moving lets the page hide its "Rezervace
                    potvrzena/přesunuta" notice while a new time is picked. */}
                <div
                    data-moving
                    className="mt-8 flex flex-col gap-3"
                >
                    <h3 className="text-sm font-medium text-muted-foreground">
                        Vyberte nový termín
                    </h3>
                    {isLoadingDays && (
                        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                            <Spinner className="size-4" />
                            Načítání dostupných termínů…
                        </div>
                    )}
                    <Calendar
                        mode="single"
                        locale={cs}
                        selected={moveDate}
                        onSelect={pickMoveDate}
                        disabled={(day) =>
                            availableDays === undefined ||
                            !availableDaySet.has(
                                localDateToUtcMidnight(day).getTime()
                            )
                        }
                        className="w-full bg-transparent"
                    />

                    {moveDate &&
                        (isLoadingSlots ? (
                            <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
                                <Spinner className="size-4" />
                                Načítám dostupné termíny…
                            </div>
                        ) : (
                            <div className="grid grid-cols-4 gap-2">
                                {moveSlots?.length === 0 && (
                                    <p className="col-span-4 text-center text-sm text-muted-foreground">
                                        Pro tento den nejsou volné žádné
                                        termíny.
                                    </p>
                                )}
                                {moveSlots?.map((s) => (
                                    <Button
                                        key={s}
                                        type="button"
                                        size="lg"
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
                        ))}

                    {movesIntoLockedWindow && (
                        <Alert variant="info">
                            <Info />

                            <AlertDescription>
                                Termín je za méně než 24 hodin – po přesunu ho
                                už půjde změnit jen telefonicky.
                            </AlertDescription>
                        </Alert>
                    )}

                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle />
                            <AlertTitle>{error}</AlertTitle>
                        </Alert>
                    )}

                    <div className="mt-2 flex justify-between">
                        <Button
                            type="button"
                            variant="outline"
                            size="lg"
                            onClick={() => {
                                setMode("idle");
                                setError(undefined);
                            }}
                        >
                            <ChevronLeft className="size-4" />
                            Zpět
                        </Button>
                        <Button
                            type="button"
                            size="lg"
                            disabled={selectedSlot === undefined || isPending}
                            onClick={confirmMove}
                        >
                            {isPending ? (
                                <Spinner className="size-4" />
                            ) : (
                                <Check className="size-4" />
                            )}
                            {isPending ? "Přesouvám…" : "Potvrdit přesun"}
                        </Button>
                    </div>
                </div>
            </CzechText>
        );
    }

    return (
        <CzechText>
            <>
                {/* Secondary on purpose: most visits here are to check the
                    time or save it, not to change it. */}
                <div className="mt-8 flex flex-col gap-3">
                    <h3 className="text-sm font-medium text-muted-foreground">
                        Potřebujete změnu?
                    </h3>
                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle />
                            <AlertTitle>{error}</AlertTitle>
                        </Alert>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            size="lg"
                            onClick={openMove}
                        >
                            <ArrowRightLeft className="size-4" />
                            Přesunout
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="lg"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setConfirmCancel(true)}
                        >
                            <X className="size-4" />
                            Zrušit
                        </Button>
                    </div>
                </div>

                <AlertDialog
                    open={confirmCancel}
                    onOpenChange={setConfirmCancel}
                >
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>
                                Zrušit rezervaci?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                {serviceLabel} · {dateLabel} ·{" "}
                                {formatTime(startTime)} –{" "}
                                {formatTime(startTime + durationMinutes)}. Tuto
                                akci nelze vzít zpět.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>
                                Ponechat rezervaci
                            </AlertDialogCancel>
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
        </CzechText>
    );
}
