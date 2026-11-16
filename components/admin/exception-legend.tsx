import { ExceptionDot } from "@/components/admin/exception-dot";

// Explains the calendars' exception dots - same colours as ExceptionDot.
export function ExceptionLegend() {
    const items = [
        { label: "Otevřeno navíc", extraOpen: true },
        { label: "Zavřeno", blockedFull: true },
        { label: "Částečně zavřeno", blockedPartial: true },
    ];
    return (
        <ul className="flex flex-wrap justify-center gap-x-3 gap-y-1 border-t pt-2 pb-1 text-xs text-muted-foreground">
            {items.map((item) => (
                <li
                    key={item.label}
                    className="flex items-center gap-1.5"
                >
                    <ExceptionDot
                        blockedFull={!!item.blockedFull}
                        blockedPartial={!!item.blockedPartial}
                        extraOpen={!!item.extraOpen}
                    />
                    {item.label}
                </li>
            ))}
        </ul>
    );
}
