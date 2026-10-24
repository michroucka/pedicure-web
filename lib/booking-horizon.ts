import { addUtcDays, getCzechToday } from "./utils.ts";

// How far ahead the date pickers (booking wizard, reschedule via magic
// link) fetch available days in one request. The server caps the range it
// accepts from the client a bit above this – see MAX_DAY_RANGE_DAYS in
// app/rezervace/schema.ts – so changing it here moves both together.
export const HORIZON_DAYS = 120;

// Last day a client may book online. The pickers start at tomorrow and
// fetch HORIZON_DAYS from there, so this is the last day they can show.
// Enforced on the server too (getAvailableSlots/getAvailableDaysInRange),
// not just by the UI. Admin isn't limited by it.
export function getLastBookableDay(): Date {
    return addUtcDays(getCzechToday(), HORIZON_DAYS + 1);
}
