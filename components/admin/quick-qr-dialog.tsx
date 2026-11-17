"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { QrCode } from "lucide-react";
import { QrPayment } from "@/components/admin/qr-payment";

// For a walk-in the pedikérka hasn't logged as a booking (e.g. a friend) –
// same QR UI as BookingDetailDialog's QR mode, but with no booking to
// prefill the amount from, so it starts empty with the service prices as
// one-tap amounts.
export function QuickQrDialog({ prices }: { prices: number[] }) {
    const [open, setOpen] = useState(false);
    const [amount, setAmount] = useState("");

    function close() {
        setOpen(false);
        setAmount("");
    }

    return (
        <>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        type="button"
                        variant="outline"
                        size="icon-xl"
                        className="rounded-full bg-background shadow-lg"
                        aria-label="QR platba"
                        onClick={() => setOpen(true)}
                    >
                        <QrCode className="size-6" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="left">QR platba</TooltipContent>
            </Tooltip>

            <Dialog
                open={open}
                onOpenChange={(o) => (o ? setOpen(true) : close())}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>QR platba</DialogTitle>
                    </DialogHeader>

                    {/* No autofocus: with the price buttons the iPad keyboard
                        would only pop up and cover half the screen. */}
                    <QrPayment
                        amount={amount}
                        onAmountChange={setAmount}
                        quickAmounts={prices}
                    />

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={close}
                        >
                            Zavřít
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
