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
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { Check, Mail, Phone, StickyNote, UserRound } from "lucide-react";
import { formatPhoneNumber } from "@/lib/utils.ts";
import { updateClientAction } from "@/app/(admin)/(dashboard)/klienti/actions.ts";
import type { Client } from "@/lib/generated/prisma/client.ts";

const DEFAULT_EXTRA_MINUTES = 15;

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
    const [extraTime, setExtraTime] = useState(false);
    const [extraTimeMinutes, setExtraTimeMinutes] = useState(
        DEFAULT_EXTRA_MINUTES
    );
    const [note, setNote] = useState("");
    const [lastLoadedId, setLastLoadedId] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    // Reset form fields whenever a different client is opened (React's
    // documented "adjusting state during render" pattern — avoids an
    // effect + extra render round-trip).
    if (client && client.id !== lastLoadedId) {
        setLastLoadedId(client.id);
        setName(client.name);
        setPhone(client.phone);
        setEmail(client.email ?? "");
        setExtraTime(client.extraTimeMinutes > 0);
        setExtraTimeMinutes(client.extraTimeMinutes || DEFAULT_EXTRA_MINUTES);
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
                extraTimeMinutes: extraTime ? extraTimeMinutes : 0,
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
                            Jméno
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
                            Email (nepovinné)
                        </span>
                        <Input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <label className="flex items-center gap-2">
                        <Checkbox
                            checked={extraTime}
                            onCheckedChange={(v) => setExtraTime(!!v)}
                        />
                        <span className="text-sm">
                            Tomuto klientovi to trvá déle
                        </span>
                    </label>

                    {extraTime && (
                        <div className="flex items-center gap-2">
                            <Input
                                type="number"
                                min={5}
                                step={5}
                                className="w-20"
                                value={extraTimeMinutes}
                                onChange={(e) =>
                                    setExtraTimeMinutes(
                                        Number(e.target.value) || 0
                                    )
                                }
                            />
                            <span className="text-sm text-muted-foreground">
                                minut navíc ke každé službě
                            </span>
                        </div>
                    )}

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
                        <Check className="size-4" />
                        {isPending ? "Ukládám…" : "Uložit"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
