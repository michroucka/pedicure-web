"use client";

import { useTransition } from "react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { Button } from "@/components/ui/button.tsx";
import { CalendarOff, Sun, Trash2 } from "lucide-react";
import { formatTime } from "@/lib/utils.ts";
import { deleteException } from "@/app/admin/(dashboard)/availability/actions.ts";

export type ExceptionItem = {
    id: string;
    date: Date;
    type: "BLOCKED" | "EXTRA_OPEN";
    startTime: number | null;
    endTime: number | null;
};

export function ExceptionList({ exceptions }: { exceptions: ExceptionItem[] }) {
    const [isDeleting, startTransition] = useTransition();

    if (exceptions.length === 0) {
        return (
            <p className="text-sm text-muted-foreground">
                Žádné nadcházející výjimky.
            </p>
        );
    }

    return (
        <div className="flex flex-col gap-2">
            {exceptions.map((exception) => (
                <div
                    key={exception.id}
                    className="flex items-center justify-between rounded-2xl border p-3"
                >
                    <div className="flex items-center gap-2 text-sm">
                        {exception.type === "BLOCKED" ? (
                            <CalendarOff className="size-4 text-muted-foreground" />
                        ) : (
                            <Sun className="size-4 text-muted-foreground" />
                        )}
                        <span>
                            {format(exception.date, "d. M. yyyy", { locale: cs })}
                            {exception.startTime !== null &&
                            exception.endTime !== null ? (
                                <>
                                    {" "}
                                    · {formatTime(exception.startTime)}–
                                    {formatTime(exception.endTime)}
                                </>
                            ) : (
                                " · celý den"
                            )}
                        </span>
                    </div>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled={isDeleting}
                        onClick={() =>
                            startTransition(async () => {
                                await deleteException(exception.id);
                            })
                        }
                    >
                        <Trash2 className="size-4" />
                    </Button>
                </div>
            ))}
        </div>
    );
}
