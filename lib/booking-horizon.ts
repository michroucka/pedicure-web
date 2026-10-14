// How far ahead the date pickers (booking wizard, reschedule via magic
// link) fetch available days in one request. The server caps the range it
// accepts from the client a bit above this — see MAX_DAY_RANGE_DAYS in
// app/rezervace/schema.ts — so changing it here moves both together.
export const HORIZON_DAYS = 120;
