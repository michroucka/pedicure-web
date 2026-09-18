import { cn } from "@/lib/utils.ts";

// Same convention everywhere an AvailabilityException needs a compact
// visual: red = blocked all day, yellow = blocked part of the day,
// green = extra-open, diagonal split = a partial block and extra-open
// both landing on the same day.
export function ExceptionDot({
    blockedFull,
    blockedPartial,
    extraOpen,
    className,
}: {
    blockedFull: boolean;
    blockedPartial: boolean;
    extraOpen: boolean;
    className?: string;
}) {
    const isSplit = !blockedFull && blockedPartial && extraOpen;

    const dotClassName = blockedFull
        ? "bg-danger-foreground"
        : isSplit
          ? undefined
          : blockedPartial
            ? "bg-warning-foreground"
            : extraOpen
              ? "bg-success-foreground"
              : undefined;

    if (dotClassName === undefined && !isSplit) return null;

    return (
        <span
            className={cn(
                "size-2 rounded-full ring-1 ring-background",
                dotClassName,
                className
            )}
            style={
                isSplit
                    ? {
                          background:
                              "linear-gradient(-45deg, var(--warning-foreground) 50%, var(--success-foreground) 50%)",
                      }
                    : undefined
            }
        />
    );
}
