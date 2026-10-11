"use client";

import { useState, useTransition } from "react";
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
import { Spinner } from "@/components/ui/spinner.tsx";
import { Check, Mail, Phone, StickyNote, UserRound } from "lucide-react";
import { formatPhoneNumber } from "@/lib/utils.ts";
import { updateClientAction } from "@/app/(admin)/(dashboard)/klienti/actions.ts";
import type { Client } from "@/lib/generated/prisma/client.ts";
import {
    ExtraTimeField,
    NO_EXTRA_TIME,
    extraTimeFromMinutes,
    extraTimeToMinutes,
    type ExtraTime,
} from "@/components/admin/extra-time-field.tsx";

export function ClientEditDialog({
    client,
    onOpenChange,
}: {
    client: Client | null;
    onOpenChange: (open: boolean) => void;
}) {
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [extraTime, setExtraTime] = useState<ExtraTime>(NO_EXTRA_TIME);
    const [note, setNote] = useState("");
    const [lastLoadedId, setLastLoadedId] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    // Reset form fields whenever a different client is opened (React's
    // documented "adjusting state during render" pattern — avoids an
    // effect + extra render round-trip).
    if (client && client.id !== lastLoadedId) {
        setLastLoadedId(client.id);
        setName(client.name);
        setPhone(client.phone ?? "");
        setEmail(client.email ?? "");
        setExtraTime(extraTimeFromMinutes(client.extraTimeMinutes));
        setNote(client.note ?? "");
    }
    if (!client && lastLoadedId !== null) {
        setLastLoadedId(null);
    }

    function submit() {
        if (!client) return;
        startTransition(async () => {
            await updateClientAction(client.id, {
                name: name.trim(),
                phone: phone.trim(),
                email: email.trim(),
                extraTimeMinutes: extraTimeToMinutes(extraTime),
                note: note.trim(),
            });
            onOpenChange(false);
        });
    }

    if (!client) return null;

    return (
        <Dialog
            open={!!client}
            onOpenChange={onOpenChange}
        >
            <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
                <DialogHeader>
                    <DialogTitle>Klient</DialogTitle>
                </DialogHeader>

                <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                        <span className="flex items-center gap-1 text-sm font-medium">
                            <UserRound className="size-4" />
                            Jméno <span className="text-red-500">*</span>
                        </span>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <span className="flex items-center gap-1 text-sm font-medium">
                            <Phone className="size-4" />
                            Telefon
                        </span>
                        <Input
                            value={phone}
                            onChange={(e) =>
                                setPhone(formatPhoneNumber(e.target.value))
                            }
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <span className="flex items-center gap-1 text-sm font-medium">
                            <Mail className="size-4" />
                            Email
                        </span>
                        <Input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <ExtraTimeField
                        value={extraTime}
                        onChange={setExtraTime}
                    />

                    <div className="flex flex-col gap-1">
                        <span className="flex items-center gap-1 text-sm font-medium">
                            <StickyNote className="size-4" />
                            Poznámka
                        </span>
                        <Textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                        />
                    </div>
                </div>

                <DialogFooter>
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
                        {isPending ? "Ukládám…" : "Uložit"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
