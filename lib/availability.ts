export type TimeSlot = { start: number; end: number };
export type Exception = {
    type: "BLOCKED" | "EXTRA_OPEN";
    start: number | null;
    end: number | null;
};

const FULL_DAY: TimeSlot = { start: 0, end: 24 * 60 };
const GRID_STEP: number = 15;

export function toExceptionRange(exception: Exception): TimeSlot {
    if (exception.start === null && exception.end === null) {
        return FULL_DAY;
    }

    if (exception.start === null || exception.end === null) {
        throw Error(
            "AvailabilityException má vyplněný jen start nebo jen end -> neplatná data"
        );
    }

    return { start: exception.start, end: exception.end };
}

export function rangesOverlap(a: TimeSlot, b: TimeSlot): boolean {
    return a.start < b.end && b.start < a.end;
}

export function subtractOne(s: TimeSlot, blocked: TimeSlot): TimeSlot[] {
    const overlapStart: number = Math.max(s.start, blocked.start);
    const overlapEnd: number = Math.min(s.end, blocked.end);

    if (overlapStart >= overlapEnd) {
        return [s];
    }

    const pieces: TimeSlot[] = [];
    if (overlapStart > s.start) {
        pieces.push({ start: s.start, end: overlapStart });
    }
    if (overlapEnd < s.end) {
        pieces.push({ start: overlapEnd, end: s.end });
    }
    return pieces;
}

export function subtractFromSlots(
    slots: TimeSlot[],
    blocked: TimeSlot
): TimeSlot[] {
    const result: TimeSlot[] = [];
    for (const s of slots) {
        result.push(...subtractOne(s, blocked));
    }
    return result;
}

export function mergeSubsequentSlots(slots: TimeSlot[]): TimeSlot[] {
    const result: TimeSlot[] = [...slots];
    result.sort((a, b) => a.start - b.start);

    for (let i = 0; i < result.length - 1; i++) {
        const s = result[i];
        const next = result[i + 1];
        if (s.end >= next.start) {
            const newStart = s.start;
            result[i + 1] = { start: newStart, end: Math.max(s.end, next.end) };
            result.splice(i, 1);
            i--;
        }
    }

    return result;
}

export function resolveDayTimeSlots(
    recurring: TimeSlot[],
    exceptions: Exception[]
): TimeSlot[] {
    let slots: TimeSlot[] = recurring;

    for (const exception of exceptions) {
        const range = toExceptionRange(exception);

        if (exception.type === "BLOCKED") {
            slots = subtractFromSlots(slots, range);
        } else {
            slots = [...slots, range];
        }
    }

    return mergeSubsequentSlots(slots);
}

export function filterBookings(
    bookings: TimeSlot[],
    slot: TimeSlot
): TimeSlot[] {
    const result: TimeSlot[] = [];
    // Overlap, not containment: a booking sticking out of the window (custom
    // "outside hours" time, or hours shortened after it was made) still
    // occupies the part inside it.
    for (const booking of bookings) {
        if (rangesOverlap(booking, slot)) {
            result.push(booking);
        }
    }
    return result.sort((a, b) => a.start - b.start);
}

export function computeGaps(
    slots: TimeSlot[],
    bookings: TimeSlot[]
): TimeSlot[] {
    const gaps: TimeSlot[] = [];
    for (const s of slots) {
        let pointer: number = s.start;
        const bookingsInTimeSlot: TimeSlot[] = filterBookings(bookings, s);

        for (const b of bookingsInTimeSlot) {
            if (pointer < b.start) {
                gaps.push({ start: pointer, end: b.start });
            }
            pointer = Math.max(pointer, b.end);
        }

        if (pointer < s.end) {
            gaps.push({ start: pointer, end: s.end });
        }
    }
    return gaps;
}

// Same categorization as the /dostupnost calendar dot (see ExceptionDot) —
// a full-day block is a BLOCKED exception with no times set, everything
// else BLOCKED is partial.
export function categorizeExceptions(
    exceptions: { type: "BLOCKED" | "EXTRA_OPEN"; startTime: number | null }[]
): { blockedFull: boolean; blockedPartial: boolean; extraOpen: boolean } {
    return {
        blockedFull: exceptions.some(
            (e) => e.type === "BLOCKED" && e.startTime === null
        ),
        blockedPartial: exceptions.some(
            (e) => e.type === "BLOCKED" && e.startTime !== null
        ),
        extraOpen: exceptions.some((e) => e.type === "EXTRA_OPEN"),
    };
}

// The complement of `windows` within [gridStart, gridEnd] — the closed
// stretches a timeline should shade (before opening, between two windows,
// after closing), including the whole grid when the day has no windows
// at all.
export function computeClosedRanges(
    windows: TimeSlot[],
    gridStart: number,
    gridEnd: number
): TimeSlot[] {
    const sorted = [...windows].sort((a, b) => a.start - b.start);
    const closed: TimeSlot[] = [];
    let cursor = gridStart;

    for (const w of sorted) {
        const start = Math.max(w.start, gridStart);
        const end = Math.min(w.end, gridEnd);
        if (start > cursor) {
            closed.push({ start: cursor, end: Math.min(start, gridEnd) });
        }
        cursor = Math.max(cursor, end);
    }

    if (cursor < gridEnd) {
        closed.push({ start: cursor, end: gridEnd });
    }

    return closed;
}

// The day-override editor shows the day's *target* open blocks directly
// (prefilled from the resolved current state, then dragged around by the
// admin) instead of asking her to think in terms of "block" vs "extra open"
// deltas. Saving needs to translate that target back into the exceptions
// that would resolve to it: whatever's in `recurring` but not covered by
// `target` becomes a BLOCKED range, and whatever's in `target` but not
// covered by `recurring` becomes an EXTRA_OPEN range. Order-independent —
// each side is just "these minus the union of those".
export function diffDayBlocks(
    recurring: TimeSlot[],
    target: TimeSlot[]
): { blocked: TimeSlot[]; extraOpen: TimeSlot[] } {
    let blocked = recurring;
    for (const t of target) {
        blocked = subtractFromSlots(blocked, t);
    }

    let extraOpen = target;
    for (const r of recurring) {
        extraOpen = subtractFromSlots(extraOpen, r);
    }

    return { blocked, extraOpen };
}

export function computeAvailableSlots(
    slots: TimeSlot[],
    bookings: TimeSlot[],
    serviceDuration: number,
    minServiceDuration: number,
    // Admin-only escape hatch (see lib/get-available-slots.ts): she can see
    // the whole day's layout before picking a time, unlike an online client
    // clicking a bare list of slots, so the "don't strand an unfillable gap"
    // guardrail below can be skipped for her without leaving anyone
    // confused about a slot that quietly vanished.
    allowUnfillableGaps: boolean = false
): number[] {
    const gaps: TimeSlot[] = computeGaps(slots, bookings);
    const result: number[] = [];

    for (const gap of gaps) {
        for (
            let start: number = gap.start;
            start + serviceDuration <= gap.end;
            start += GRID_STEP
        ) {
            const before: number = start - gap.start;
            const after: number = gap.end - (start + serviceDuration);

            const beforeOk = before === 0 || before >= minServiceDuration;
            const afterOk = after === 0 || after >= minServiceDuration;

            if (allowUnfillableGaps || (beforeOk && afterOk)) {
                result.push(start);
            }
        }
    }
    return result;
}

// Rows to store for the weekly schedule. Overlapping blocks are rejected
// by the schema before this runs; blocks that only touch (9–12, 12–14)
// are merged into one row, same as resolveDayTimeSlots would treat them.
// Grouped by dayOfWeek, not by input entry, so a day sent twice merges
// too.
export function toRecurringRows(
    days: { dayOfWeek: number; blocks: TimeSlot[] }[]
): { dayOfWeek: number; startTime: number; endTime: number }[] {
    const slotsByDay = new Map<number, TimeSlot[]>();
    for (const day of days) {
        slotsByDay.set(day.dayOfWeek, [
            ...(slotsByDay.get(day.dayOfWeek) ?? []),
            ...day.blocks,
        ]);
    }
    return [...slotsByDay].flatMap(([dayOfWeek, slots]) =>
        mergeSubsequentSlots(slots).map((slot) => ({
            dayOfWeek,
            startTime: slot.start,
            endTime: slot.end,
        }))
    );
}
