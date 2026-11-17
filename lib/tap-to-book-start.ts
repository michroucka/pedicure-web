type TimeRange = { startTime: number; endTime: number };

// Where a booking tapped at `tapped` (minutes from midnight) can start, so
// that at least the shortest service fits before the next booking:
// - inside a gap too short for it → null (nothing to offer there),
// - near the end of a gap → moved back to where it still fits.
// Opening hours aren't a limit – the admin can book outside them.
export function resolveTapToBookStart({
    tapped,
    bookings,
    minDurationMinutes,
}: {
    tapped: number;
    bookings: TimeRange[];
    minDurationMinutes: number;
}): number | null {
    if (bookings.some((b) => tapped >= b.startTime && tapped < b.endTime)) {
        return null;
    }
    const previousEnd = Math.max(
        -Infinity,
        ...bookings.filter((b) => b.endTime <= tapped).map((b) => b.endTime)
    );
    const nextStart = Math.min(
        Infinity,
        ...bookings.filter((b) => b.startTime > tapped).map((b) => b.startTime)
    );
    if (nextStart - previousEnd < minDurationMinutes) return null;
    return Math.min(tapped, nextStart - minDurationMinutes);
}
