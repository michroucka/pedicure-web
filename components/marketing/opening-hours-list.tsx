import type { OpeningHoursRow } from "@/lib/opening-hours";
import { cn } from "@/lib/utils";

export function OpeningHoursList({
    rows,
    className,
}: {
    rows: OpeningHoursRow[];
    className?: string;
}) {
    return (
        <dl
            className={cn(
                "grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 tabular-nums",
                className
            )}
        >
            {rows.map((row) => (
                <div
                    key={row.days}
                    className="contents"
                >
                    <dt>{row.days}</dt>
                    <dd className="whitespace-nowrap">
                        {row.hours.map((block) => (
                            <span
                                key={block}
                                className="block"
                            >
                                {block}
                            </span>
                        ))}
                    </dd>
                </div>
            ))}
        </dl>
    );
}
