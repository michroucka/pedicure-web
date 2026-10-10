"use client";

// Self-contained on purpose — only depends on other shadcn/ui primitives
// (Input, Button, Popover) + lucide-react + `cn`, no project-specific types
// or logic. Drop the file into another shadcn project as-is.
//
// Behaves like <input type="time">, but:
// - the grid step is actually enforced (native `step` is inconsistent
//   across browsers/OSes for the picker UI, only for stepUp/stepDown)
// - the picker is a two-column hour/minute wheel (like iOS), not the
//   OS-native widget, so it looks/behaves the same everywhere and needs
//   fewer swipes than one long flat list of times
// - picking on the wheel only commits when you tap the checkmark —
//   scrolling it around is just "dialing in" a value, same as iOS
// - typing is still free-form (any digits) independent of the wheel; it
//   commits on blur/Enter and gets snapped to the nearest step, same as a
//   native stepped input would reject out-of-grid values. Typed digits
//   also live-preview on the wheel as you type.

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Check, Clock } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverAnchor,
    PopoverContent,
} from "@/components/ui/popover";

const MINUTES_PER_DAY = 24 * 60;
const ITEM_HEIGHT = 36; // px — must match the row height class below
const VISIBLE_ROWS = 5;

// Two looks the trigger ships with out of the box — `className` is for a
// one-off tweak on top (e.g. `text-right`), not for rebuilding a whole
// style from scratch at every call site.
const timePickerTriggerVariants = cva("tabular-nums", {
    variants: {
        variant: {
            // The regular boxed Input look — no overrides needed.
            default: "",
            // Compact, borderless, muted — a small inline time label (e.g.
            // sitting right under a Slider) rather than a standalone field.
            ghost: "h-auto rounded-md border-none bg-transparent px-1.5 py-0.5 text-sm text-muted-foreground shadow-none transition-colors hover:bg-accent",
        },
    },
    defaultVariants: {
        variant: "default",
    },
});

function clampToDay(total: number) {
    return ((total % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
}

function formatMinutes(total: number) {
    const hours = Math.floor(total / 60);
    const minutes = total % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function parseHHMM(value: string): number | null {
    const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours > 23 || minutes > 59) return null;
    return hours * 60 + minutes;
}

// Accepts whatever a user is likely to type: "9", "14", "905", "0905",
// "9:5", "09:05"... and turns it into minutes-from-midnight.
function parseTypedTime(raw: string): number | null {
    const cleaned = raw.trim();
    if (!cleaned) return null;

    const withSeparator = /^(\d{1,2})[:.](\d{1,2})$/.exec(cleaned);
    if (withSeparator) {
        const hours = Number(withSeparator[1]);
        const minutes = Number(withSeparator[2]);
        if (hours > 23 || minutes > 59) return null;
        return hours * 60 + minutes;
    }

    if (/^\d+$/.test(cleaned) && cleaned.length <= 4) {
        if (cleaned.length <= 2) {
            const hours = Number(cleaned);
            return hours > 23 ? null : hours * 60;
        }
        const minutes = Number(cleaned.slice(-2));
        const hours = Number(cleaned.slice(0, -2));
        if (hours > 23 || minutes > 59) return null;
        return hours * 60 + minutes;
    }

    return null;
}

// Snaps to the nearest step mark (remainder in the lower half rounds down,
// upper half rounds up) — generalized version of the project's
// roundToQuarterHour, parameterized by step instead of a hardcoded 15.
function roundToStep(total: number, step: number) {
    const remainder = ((total % step) + step) % step;
    const rounded =
        remainder * 2 <= step ? total - remainder : total + (step - remainder);
    return clampToDay(rounded);
}

function buildRange(min: number, max: number, step: number) {
    const values: number[] = [];
    for (let v = min; v <= max; v += step) values.push(v);
    return values;
}

const alignUp = (v: number, step: number) => Math.ceil(v / step) * step;
const alignDown = (v: number, step: number) => Math.floor(v / step) * step;

function nearestIndex(values: number[], target: number) {
    let bestIndex = 0;
    let bestDiff = Infinity;
    values.forEach((v, i) => {
        const diff = Math.abs(v - target);
        if (diff < bestDiff) {
            bestDiff = diff;
            bestIndex = i;
        }
    });
    return bestIndex;
}

// One scrollable, snap-to-row wheel (hours or minutes). The selection slot
// is a fixed highlight band at vertical center — the content scrolls
// underneath it, same mechanic as iOS's UIPickerView.
function WheelColumn({
    values,
    format,
    selected,
    onSelect,
    "aria-label": ariaLabel,
}: {
    values: number[];
    format: (value: number) => string;
    selected: number;
    onSelect: (value: number) => void;
    "aria-label": string;
}) {
    const containerRef = React.useRef<HTMLDivElement>(null);
    // Real rendered positions, not an assumed ITEM_HEIGHT*index — CSS
    // scroll-snap resolves its own "nearest snap point" after a scroll/
    // scrollTo settles, and that doesn't always match a hand-computed
    // offset (padding + snap interact in browser-specific ways). Measuring
    // actual offsetTop/clientHeight sidesteps the mismatch entirely instead
    // of fighting it with a more "correct" constant.
    const itemRefs = React.useRef<(HTMLButtonElement | null)[]>([]);
    const scrollTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(
        undefined
    );
    const hasPositionedRef = React.useRef(false);
    // Drag state for the manual pointer-scroll below. `dragging` only
    // flips true past a small movement threshold, so a plain tap still
    // fires a normal click on the item instead of being swallowed by
    // pointer capture.
    const dragRef = React.useRef<{
        pointerId: number;
        startY: number;
        startScrollTop: number;
        dragging: boolean;
    } | null>(null);
    const targetIndex = nearestIndex(values, selected);

    function scrollToIndex(index: number, smooth: boolean) {
        const container = containerRef.current;
        const item = itemRefs.current[index];
        if (!container || !item) return;
        const top =
            item.offsetTop - (container.clientHeight - item.offsetHeight) / 2;
        if (Math.abs(container.scrollTop - top) > 1) {
            container.scrollTo({ top, behavior: smooth ? "smooth" : "auto" });
        }
    }

    React.useEffect(() => {
        scrollToIndex(targetIndex, hasPositionedRef.current);
        hasPositionedRef.current = true;
    }, [targetIndex]);

    function handleScroll() {
        clearTimeout(scrollTimer.current);
        scrollTimer.current = setTimeout(() => {
            const container = containerRef.current;
            if (!container) return;
            const center = container.scrollTop + container.clientHeight / 2;
            let closestIndex = 0;
            let closestDiff = Infinity;
            itemRefs.current.forEach((item, i) => {
                if (!item) return;
                const itemCenter = item.offsetTop + item.offsetHeight / 2;
                const diff = Math.abs(itemCenter - center);
                if (diff < closestDiff) {
                    closestDiff = diff;
                    closestIndex = i;
                }
            });
            const value = values[closestIndex];
            if (value !== undefined && value !== selected) onSelect(value);
        }, 80);
    }

    // Scroll the column ourselves instead of relying on the browser's
    // native wheel/touch scroll gesture. Inside a Dialog, Radix's scroll
    // lock (react-remove-scroll) only whitelists DialogContent's own DOM
    // subtree — our popover is portaled elsewhere, so native scroll
    // gestures on it get preventDefault()'d. Setting scrollTop ourselves
    // sidesteps that entirely (still fires the normal "scroll" event
    // above, so snapping/selection keeps working the same).
    function handleWheel(e: React.WheelEvent) {
        e.preventDefault();
        containerRef.current?.scrollBy({ top: e.deltaY });
    }

    function handlePointerDown(e: React.PointerEvent) {
        const container = containerRef.current;
        if (!container) return;
        dragRef.current = {
            pointerId: e.pointerId,
            startY: e.clientY,
            startScrollTop: container.scrollTop,
            dragging: false,
        };
    }

    function handlePointerMove(e: React.PointerEvent) {
        const container = containerRef.current;
        const drag = dragRef.current;
        if (!container || !drag) return;
        const delta = drag.startY - e.clientY;
        if (!drag.dragging) {
            if (Math.abs(delta) < 4) return;
            drag.dragging = true;
            container.setPointerCapture(drag.pointerId);
        }
        e.preventDefault();
        container.scrollTop = drag.startScrollTop + delta;
    }

    function endDrag(e: React.PointerEvent) {
        const drag = dragRef.current;
        if (drag?.dragging && containerRef.current?.hasPointerCapture(e.pointerId)) {
            containerRef.current.releasePointerCapture(e.pointerId);
        }
        dragRef.current = null;
    }

    return (
        <div
            ref={containerRef}
            role="listbox"
            aria-label={ariaLabel}
            // No CSS scroll-snap here on purpose — it was fighting our own
            // scrollTop writes below (the browser kept "correcting" mid-
            // gesture to its own snap point, causing jumps/jitter).
            // Snapping to the nearest item is done entirely in JS instead:
            // handleScroll's debounce + the scrollToIndex effect above.
            className="touch-none overflow-y-scroll [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{
                height: ITEM_HEIGHT * VISIBLE_ROWS,
                paddingBlock: ITEM_HEIGHT * Math.floor(VISIBLE_ROWS / 2),
            }}
            onScroll={handleScroll}
            onWheel={handleWheel}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
        >
            {values.map((v, i) => (
                <button
                    key={v}
                    ref={(el) => {
                        itemRefs.current[i] = el;
                    }}
                    type="button"
                    role="option"
                    aria-selected={i === targetIndex}
                    className="flex h-9 w-12 shrink-0 items-center justify-center text-base tabular-nums"
                    onClick={() => onSelect(v)}
                >
                    {format(v)}
                </button>
            ))}
        </div>
    );
}

export interface TimePickerProps {
    value: string;
    onChange: (value: string) => void;
    /** Grid granularity in minutes that typed input snaps to. Default 15. */
    step?: number;
    /** Earliest selectable time, "HH:mm". Default "00:00". */
    min?: string;
    /** Latest selectable time, "HH:mm". Default "23:45". */
    max?: string;
    /**
     * Where the wheel opens/nudges from while `value` is still empty —
     * doesn't touch the displayed value or fire `onChange` by itself.
     * Default is `min` (e.g. midnight).
     */
    defaultValue?: string;
    placeholder?: string;
    disabled?: boolean;
    /**
     * Allow free typing into the field (any digits, parsed + snapped to
     * `step` on blur/Enter). Default off — the field is `readOnly` and the
     * wheel popover is the only way to change the value.
     */
    allowTyping?: boolean;
    /**
     * Leading icon shown inside the trigger. Defaults to a clock icon; pass
     * `null` to render no icon at all.
     */
    icon?: React.ReactNode | null;
    /** Built-in look — see timePickerTriggerVariants. Default "default". */
    variant?: VariantProps<typeof timePickerTriggerVariants>["variant"];
    /** A one-off tweak on top of `variant` (e.g. `"text-right"`). */
    className?: string;
    id?: string;
    name?: string;
    "aria-label"?: string;
    "aria-invalid"?: boolean;
}

function TimePicker({
    value,
    onChange,
    step = 15,
    min = "00:00",
    max = "23:45",
    defaultValue,
    placeholder = "--:--",
    disabled,
    allowTyping = false,
    icon = <Clock className="size-4" />,
    variant,
    className,
    id,
    name,
    "aria-label": ariaLabel,
    "aria-invalid": ariaInvalid,
}: TimePickerProps) {
    const [open, setOpen] = React.useState(false);
    const [draft, setDraft] = React.useState(value);
    const [pendingHour, setPendingHour] = React.useState(0);
    const [pendingMinute, setPendingMinute] = React.useState(0);
    const inputRef = React.useRef<HTMLInputElement>(null);
    const contentRef = React.useRef<HTMLDivElement>(null);
    const sizerRef = React.useRef<HTMLSpanElement>(null);
    const [measuredWidth, setMeasuredWidth] = React.useState<number | null>(
        null
    );

    // Auto-size the trigger to its actual rendered content instead of a
    // guessed width class — callers vary padding/font-size (compact inline
    // labels vs. a roomy standalone field) enough that one hardcoded width
    // never fit all of them evenly on both sides. The sizer span mirrors
    // the input's real computed font so the measurement matches exactly;
    // reading the input's own padding/border (rather than special-casing
    // the icon) means it stays correct automatically either way.
    React.useLayoutEffect(() => {
        const sizer = sizerRef.current;
        const input = inputRef.current;
        if (!sizer || !input) return;
        const inputStyles = window.getComputedStyle(input);
        sizer.style.fontSize = inputStyles.fontSize;
        sizer.style.fontFamily = inputStyles.fontFamily;
        sizer.style.fontWeight = inputStyles.fontWeight;
        sizer.style.fontStyle = inputStyles.fontStyle;
        sizer.style.letterSpacing = inputStyles.letterSpacing;
        sizer.style.fontVariantNumeric = inputStyles.fontVariantNumeric;
        const horizontalExtra =
            parseFloat(inputStyles.paddingLeft) +
            parseFloat(inputStyles.paddingRight) +
            parseFloat(inputStyles.borderLeftWidth) +
            parseFloat(inputStyles.borderRightWidth);
        setMeasuredWidth(Math.ceil(sizer.offsetWidth + horizontalExtra) + 2);
    }, [icon, variant, className]);

    // Radix's own outside-click dismissal (DismissableLayer) shares one
    // layer stack across the whole app — stacked with a Dialog's own
    // layer, that bookkeeping can misfire and close this popover right
    // after it opens. We disable Radix's version entirely (see
    // onPointerDownOutside below) and do the "did you click outside"
    // check ourselves, directly against the two nodes we actually care
    // about — simple enough that Dialog nesting can't confuse it.
    React.useEffect(() => {
        if (!open) return;
        function handlePointerDown(e: PointerEvent) {
            const target = e.target as Node;
            if (inputRef.current?.contains(target)) return;
            if (contentRef.current?.contains(target)) return;
            setOpen(false);
        }
        document.addEventListener("pointerdown", handlePointerDown);
        return () =>
            document.removeEventListener("pointerdown", handlePointerDown);
    }, [open]);

    const minMinutes = parseHHMM(min) ?? 0;
    const maxMinutes = parseHHMM(max) ?? MINUTES_PER_DAY - 1;
    // Where to seed the wheel / nudge from once there's no real value yet —
    // falls back to minMinutes (e.g. midnight) when defaultValue isn't set
    // or doesn't parse.
    const fallbackMinutes = parseHHMM(defaultValue ?? "") ?? minMinutes;
    const minHour = Math.floor(minMinutes / 60);
    const maxHour = Math.floor(maxMinutes / 60);

    const hourValues = React.useMemo(
        () => buildRange(minHour, maxHour, 1),
        [minHour, maxHour]
    );
    // Clipped to whatever's still valid in the currently-dialed hour — on
    // the boundary hour(s) that's a sub-range of the step grid (e.g. max
    // "19:00" only offers :00 once the hour wheel is on 19), everywhere
    // else it's the full grid.
    const minuteValues = React.useMemo(() => {
        let lo = 0;
        let hi = 59 - (59 % step);
        if (pendingHour === minHour) lo = Math.max(lo, minMinutes - minHour * 60);
        if (pendingHour === maxHour) hi = Math.min(hi, maxMinutes - maxHour * 60);
        lo = alignUp(lo, step);
        hi = alignDown(hi, step);
        if (lo > hi) return [alignDown(hi, step)];
        return buildRange(lo, hi, step);
    }, [step, pendingHour, minHour, maxHour, minMinutes, maxMinutes]);

    // The minute list above depends on which hour is dialed in — if
    // switching hours makes the stored pendingMinute fall outside the new
    // range, derive the nearest one still valid instead of storing a
    // correction (nothing user-driven changed, so there's nothing to set
    // state for — this just keeps what's centered on the wheel in sync
    // with what confirming would actually commit).
    const effectivePendingMinute = minuteValues.includes(pendingMinute)
        ? pendingMinute
        : minuteValues[nearestIndex(minuteValues, pendingMinute)];

    // Keep the draft in sync with external value changes, but don't clobber
    // what the user is actively typing.
    React.useEffect(() => {
        if (document.activeElement !== inputRef.current) {
            setDraft(value);
        }
    }, [value]);

    function seedPending(fromMinutes: number) {
        setPendingHour(Math.floor(fromMinutes / 60));
        setPendingMinute(fromMinutes % 60);
    }

    function handleOpenChange(next: boolean) {
        setOpen(next);
        if (next) {
            seedPending(
                parseTypedTime(draft) ?? parseHHMM(value) ?? fallbackMinutes
            );
        }
    }

    function commit(raw: string) {
        const parsed = parseTypedTime(raw);
        if (parsed === null) {
            setDraft(value);
            return;
        }
        const rounded = Math.min(
            maxMinutes,
            Math.max(minMinutes, roundToStep(parsed, step))
        );
        const formatted = formatMinutes(rounded);
        setDraft(formatted);
        if (formatted !== value) onChange(formatted);
    }

    function nudge(direction: 1 | -1) {
        const base = parseHHMM(draft) ?? parseHHMM(value) ?? fallbackMinutes;
        const next = Math.min(
            maxMinutes,
            Math.max(minMinutes, clampToDay(base + direction * step))
        );
        const formatted = formatMinutes(next);
        setDraft(formatted);
        onChange(formatted);
    }

    function confirmWheel() {
        const combined = pendingHour * 60 + effectivePendingMinute;
        const rounded = Math.min(
            maxMinutes,
            Math.max(minMinutes, roundToStep(combined, step))
        );
        const formatted = formatMinutes(rounded);
        setDraft(formatted);
        onChange(formatted);
        setOpen(false);
        inputRef.current?.blur();
    }

    return (
        <Popover
            open={open}
            onOpenChange={handleOpenChange}
        >
            <PopoverAnchor asChild>
                <div className="relative inline-flex items-center">
                    {icon !== null && (
                        <span
                            aria-hidden
                            className="pointer-events-none absolute left-2 flex items-center text-muted-foreground"
                        >
                            {icon}
                        </span>
                    )}
                    {/* Invisible, out-of-flow — exists only so its
                        offsetWidth tells us how wide "00:00" actually
                        renders in this input's real font. */}
                    <span
                        ref={sizerRef}
                        aria-hidden
                        className="pointer-events-none invisible absolute top-0 left-0 whitespace-pre"
                    >
                        00:00
                    </span>
                    <Input
                        ref={inputRef}
                        id={id}
                        name={name}
                        aria-label={ariaLabel}
                        aria-invalid={ariaInvalid}
                        inputMode="numeric"
                        autoComplete="off"
                        readOnly={!allowTyping}
                        placeholder={placeholder}
                        disabled={disabled}
                        style={{
                            paddingLeft: icon !== null ? "1.75rem" : undefined,
                            width: measuredWidth ?? undefined,
                        }}
                        className={cn(
                            timePickerTriggerVariants({ variant }),
                            className
                        )}
                        value={draft}
                        onFocus={() => handleOpenChange(true)}
                        onChange={(e) => {
                            setDraft(e.target.value);
                            // Live-preview on the wheel as the user types,
                            // without committing yet.
                            const parsed = parseTypedTime(e.target.value);
                            if (parsed !== null) seedPending(parsed);
                        }}
                        onBlur={(e) => commit(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "ArrowUp") {
                                e.preventDefault();
                                nudge(1);
                            } else if (e.key === "ArrowDown") {
                                e.preventDefault();
                                nudge(-1);
                            } else if (e.key === "Enter") {
                                e.preventDefault();
                                commit(e.currentTarget.value);
                                setOpen(false);
                            } else if (e.key === "Escape") {
                                setDraft(value);
                                setOpen(false);
                            }
                        }}
                    />
                </div>
            </PopoverAnchor>
            <PopoverContent
                ref={contentRef}
                align="start"
                className="w-auto p-2"
                onOpenAutoFocus={(e) => e.preventDefault()}
                onCloseAutoFocus={(e) => e.preventDefault()}
                // We handle outside-click dismissal ourselves (see the
                // effect above) — always prevent Radix's own version so
                // its cross-layer bookkeeping (shared with any ancestor
                // Dialog) can't close this out from under us.
                onPointerDownOutside={(e) => e.preventDefault()}
                onInteractOutside={(e) => e.preventDefault()}
            >
                <div className="relative flex items-center gap-1">
                    <div
                        aria-hidden
                        className="pointer-events-none absolute inset-x-0 top-1/2 h-9 -translate-y-1/2 rounded-md border-y border-border bg-accent/40"
                    />
                    <WheelColumn
                        values={hourValues}
                        format={(v) => String(v).padStart(2, "0")}
                        selected={pendingHour}
                        onSelect={setPendingHour}
                        aria-label="Hodiny"
                    />
                    <span className="text-base font-medium text-muted-foreground">
                        :
                    </span>
                    <WheelColumn
                        values={minuteValues}
                        format={(v) => String(v).padStart(2, "0")}
                        selected={effectivePendingMinute}
                        onSelect={setPendingMinute}
                        aria-label="Minuty"
                    />
                </div>
                <Button
                    type="button"
                    size="sm"
                    className="mt-2 w-full"
                    aria-label="Potvrdit čas"
                    onClick={confirmWheel}
                >
                    <Check className="size-4" />
                </Button>
            </PopoverContent>
        </Popover>
    );
}

export { TimePicker };
