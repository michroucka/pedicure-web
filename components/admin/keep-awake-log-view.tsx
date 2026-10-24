"use client";

import { ChevronDownIcon, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible.tsx";
import { clearKeepAwakeLog, useKeepAwakeLog } from "@/lib/keep-awake-log.ts";

const timeFormat = new Intl.DateTimeFormat("cs-CZ", {
    day: "numeric",
    month: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
});

export function KeepAwakeLogView() {
    const entries = useKeepAwakeLog();
    const newestFirst = [...entries].reverse();

    return (
        <Collapsible className="rounded-md data-[state=open]:bg-muted">
            <CollapsibleTrigger asChild>
                <Button
                    variant="ghost"
                    className="group w-full"
                >
                    <ScrollText className="size-4" />
                    Diagnostika nezhasínání
                    <ChevronDownIcon className="ml-auto group-data-[state=open]:rotate-180" />
                </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="flex flex-col gap-2 p-2.5 pt-0 text-sm">
                {newestFirst.length === 0 ? (
                    <p className="text-muted-foreground">
                        Zatím žádné záznamy.
                    </p>
                ) : (
                    <ol className="flex max-h-80 flex-col gap-1 overflow-y-auto font-mono text-xs">
                        {newestFirst.map((entry, i) => (
                            <li key={`${entry.at}-${i}`}>
                                <span className="text-muted-foreground">
                                    {timeFormat.format(new Date(entry.at))}
                                </span>{" "}
                                {entry.message}
                            </li>
                        ))}
                    </ol>
                )}
                <Button
                    variant="outline"
                    size="sm"
                    className="self-start"
                    onClick={clearKeepAwakeLog}
                >
                    Smazat záznamy
                </Button>
            </CollapsibleContent>
        </Collapsible>
    );
}
