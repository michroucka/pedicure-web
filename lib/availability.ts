
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
        throw Error("AvailabilityException má vyplněný jen start nebo jen end -> neplatná data");
    }

    return { start: exception.start, end: exception.end };
}

export function subtractOne(s: TimeSlot, blocked: TimeSlot): TimeSlot[] {
    const overlapStart: number = Math.max(s.start, blocked.start);
    const overlapEnd: number = Math.min(s.end, blocked.end);

    if (overlapStart >= overlapEnd) {
        return [s];
    }

    const pieces: TimeSlot[] = [];
    if (overlapStart > s.start) {
        pieces.push({start: s.start, end: overlapStart});
    }
    if (overlapEnd < s.end) {
        pieces.push({start: overlapEnd, end: s.end});
    }
    return pieces;
}

export function subtractFromSlots(slots: TimeSlot[], blocked: TimeSlot): TimeSlot[] {
    const result: TimeSlot[] = [];
    for (const s of slots) {
        result.push(...subtractOne(s, blocked));
    }
    return result;
}

export function resolveDayTimeSlots(recurring: TimeSlot[], exceptions: Exception[]): TimeSlot[] {
    let slots: TimeSlot[] = recurring;

    for (const exception of exceptions) {
        const range = toExceptionRange(exception);

        if (exception.type === "BLOCKED") {
            slots = subtractFromSlots(slots, range);
        } else {
            slots = [...slots, range];
        }
    }

    return slots;
}

export function filterBookings(bookings: TimeSlot[], slot: TimeSlot): TimeSlot[] {
    const result: TimeSlot[] = [];
    for (const booking of bookings) {
        if (booking.start >= slot.start && booking.end <= slot.end) {
            result.push(booking);
        }
    }
    return result.sort((a, b) => a.start - b.start);
}

export function computeGaps(slots: TimeSlot[], bookings: TimeSlot[]): TimeSlot[] {
    const gaps: TimeSlot[] = [];
    for (const s of slots) {
        let pointer: number = s.start;
        const bookingsInTimeSlot: TimeSlot[] = filterBookings(bookings, s);

        for (const b of bookingsInTimeSlot) {
            if (pointer < b.start) {
                gaps.push({start: pointer, end: b.start});
            }
            pointer = Math.max(pointer, b.end);
        }

        if (pointer < s.end) {
            gaps.push({start: pointer, end: s.end});
        }
    }
    return gaps;
}

export function computeAvailableSlots(
  slots: TimeSlot[],
  bookings: TimeSlot[],
  serviceDuration: number,
  minServiceDuration: number
): number[] {
    const gaps: TimeSlot[] = computeGaps(slots, bookings);
    const result: number[] = [];

    for (const gap of gaps) {
        for (let start: number = gap.start; start + serviceDuration <= gap.end; start += GRID_STEP) {
            const before: number = start - gap.start;
            const after: number = gap.end - (start + serviceDuration);

            const beforeOk = before === 0 || before >= minServiceDuration;
            const afterOk = after === 0 || after >= minServiceDuration;

            if (beforeOk && afterOk) {
                result.push(start);
            }
        }
    }
    return result;
}