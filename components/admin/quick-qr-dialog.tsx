"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip.tsx";
import { QrCode } from "lucide-react";
import { QrPayment } from "@/components/admin/qr-payment.tsx";

// For a walk-in the pedikérka hasn't logged as a booking (e.g. a friend) —
// same QR UI as BookingDetailDialog's QR mode, but with no booking to
// prefill the amount from, so it starts empty and autofocuses for typing.
export function QuickQrDialog() {
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
                        variant="secondary"
                        size="icon-xl"
                        className="rounded-full shadow-lg"
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

                    <QrPayment
                        amount={amount}
                        onAmountChange={setAmount}
                        autoFocus
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
