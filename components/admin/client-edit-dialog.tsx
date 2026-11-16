"use client";

import { useState, useTransition } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertTitle } from "@/components/ui/alert";
import {
    AlertCircle,
    Check,
    Mail,
    Phone,
    StickyNote,
    Trash2,
    UserRound,
} from "lucide-react";
import { formatPhoneNumber } from "@/lib/utils";
import {
    deleteClientAction,
    updateClientAction,
} from "@/app/(admin)/(dashboard)/klienti/actions";
import type { ClientListItem } from "@/components/admin/client-list";
import {
    ExtraTimeField,
    NO_EXTRA_TIME,
    extraTimeFromMinutes,
    extraTimeToMinutes,
    type ExtraTime,
} from "@/components/admin/extra-time-field";
import { NoteHealthHint } from "@/components/admin/note-health-hint";

export function ClientEditDialog({
    client,
    onOpenChange,
}: {
    client: ClientListItem | null;
    onOpenChange: (open: boolean) => void;
}) {
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [extraTime, setExtraTime] = useState<ExtraTime>(NO_EXTRA_TIME);
    const [note, setNote] = useState("");
    const [error, setError] = useState<string>();
    const [lastLoadedId, setLastLoadedId] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    // Reset form fields whenever a different client is opened (React's
    // documented "adjusting state during render" pattern – avoids an
    // effect + extra render round-trip).
    if (client && client.id !== lastLoadedId) {
        setLastLoadedId(client.id);
        setName(client.name);
        setPhone(client.phone ?? "");
        setEmail(client.email ?? "");
        setExtraTime(extraTimeFromMinutes(client.extraTimeMinutes));
        setNote(client.note ?? "");
        setError(undefined);
        setConfirmDelete(false);
    }
    if (!client && lastLoadedId !== null) {
        setLastLoadedId(null);
    }

    function submit() {
        if (!client) return;
        setError(undefined);
        startTransition(async () => {
            const result = await updateClientAction(client.id, {
                name: name.trim(),
                phone: phone.trim(),
                email: email.trim(),
                extraTimeMinutes: extraTimeToMinutes(extraTime),
                note: note.trim(),
            });
            if (!result.ok) {
                setError(result.error);
                return;
            }
            onOpenChange(false);
        });
    }

    function doDelete(e: React.MouseEvent) {
        // keep the AlertDialog open (spinner) until the action finishes
        e.preventDefault();
        if (!client) return;
        startTransition(async () => {
            await deleteClientAction(client.id);
            setConfirmDelete(false);
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
                    <DialogTitle>Upravit klienta</DialogTitle>
                    <DialogDescription>
                        {upcomingSummary(client.upcomingBookings)}
                    </DialogDescription>
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
                            E-mail
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
                        <NoteHealthHint />
                    </div>

                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle />
                            <AlertTitle>{error}</AlertTitle>
                        </Alert>
                    )}
                </div>

                <DialogFooter className="flex-row justify-between gap-2 sm:justify-between">
                    <Button
                        type="button"
                        variant="destructive"
                        disabled={isPending}
                        onClick={() => setConfirmDelete(true)}
                    >
                        <Trash2 className="size-4" />
                        Smazat
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
                        {isPending ? "Ukládám…" : "Uložit"}
                    </Button>
                </DialogFooter>
            </DialogContent>

            <AlertDialog
                open={confirmDelete}
                onOpenChange={setConfirmDelete}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Smazat klienta?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {client.name} zmizí ze seznamu klientů a z nabídky
                            jmen při přidávání rezervace.
                            {client.upcomingBookings > 0 &&
                                ` Má ${upcomingLabel(client.upcomingBookings)} – ${client.upcomingBookings === 1 ? "ta zůstane" : "ty zůstanou"} v kalendáři.`}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Zpět</AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            disabled={isPending}
                            onClick={doDelete}
                        >
                            {isPending ? (
                                <Spinner className="size-4" />
                            ) : (
                                <Trash2 className="size-4" />
                            )}
                            {isPending ? "Mažu…" : "Smazat klienta"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Dialog>
    );
}

// "1 naplánovanou rezervaci", "2 naplánované rezervace", "5 naplánovaných
// rezervací" – Czech needs three forms.
function upcomingSummary(count: number): string {
    if (count === 0) return "Žádné nadcházející rezervace";
    if (count <= 4) return `${count} nadcházející rezervace`;
    return `${count} nadcházejících rezervací`;
}

function upcomingLabel(count: number): string {
    if (count === 1) return "1 naplánovanou rezervaci";
    if (count >= 2 && count <= 4) return `${count} naplánované rezervace`;
    return `${count} naplánovaných rezervací`;
}
