import { z } from "zod";

export const PHONE_RE = /^(\+420 )?\d{3} \d{3} \d{3}$/;

// Minutes since midnight, the way Booking.startTime is stored.
export const startTimeSchema = z.int().min(0).max(1439);

// "YYYY-MM-DD" as the pickers send it — z.iso.date() also rejects dates
// that don't exist (2026-02-30), which a plain regex would let through.
export const dateStrSchema = z.iso.date();
