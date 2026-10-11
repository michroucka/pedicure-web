// Extra time is entered in steps of 5 min. Shared by the admin form (snaps
// the input on blur) and the server actions (never trust the form), so
// both always agree on what a valid value is.
export const EXTRA_TIME_STEP = 5;

// Rounds to the nearest step, never negative; anything that isn't a
// number counts as no extra time.
export function normalizeExtraMinutes(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.round(value / EXTRA_TIME_STEP) * EXTRA_TIME_STEP);
}
