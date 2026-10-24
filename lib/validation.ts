import { z } from "zod";
import { formatPhoneNumber } from "@/lib/utils.ts";

export const PHONE_RE = /^(\+420 )?\d{3} \d{3} \d{3}$/;

export const nameSchema = z.string().trim().min(1, "Jméno je povinné").max(100);

// 1 for a solo booking, up to 4 for a group.
export const serviceIdsSchema = z.array(z.int().positive()).min(1).max(4);

// Minutes since midnight, the way Booking.startTime is stored.
export const startTimeSchema = z.int().min(0).max(1439);

// "YYYY-MM-DD" as the pickers send it — z.iso.date() also rejects dates
// that don't exist (2026-02-30), which a plain regex would let through.
export const dateStrSchema = z.iso.date();

// Prisma ids (cuid) and groupIds (UUID) — only the shape is checked, the
// query itself decides whether the record exists.
export const idSchema = z.string().min(1).max(64);

export const noteSchema = z.string().trim().max(1000);

// Admin forms prefill the phone straight from the DB, and older records
// aren't always in the "XXX XXX XXX" shape — normalize first so fixing a
// typo in a name doesn't fail on the phone. Only when formatting keeps
// every digit: formatPhoneNumber cuts anything longer (00420…) down to 9
// digits, which would silently store a different number. Empty = no phone.
export const adminPhoneSchema = z
    .string()
    .trim()
    .transform((value) => {
        if (!/^[\d\s+]+$/.test(value)) return value;
        const formatted = formatPhoneNumber(value);
        const digits = (s: string) => s.replace(/\D/g, "");
        return digits(formatted) === digits(value) ? formatted : value;
    })
    .pipe(
        z.union([
            z.literal(""),
            z
                .string()
                .regex(
                    PHONE_RE,
                    "Neplatné telefonní číslo (formát 123 456 789)."
                ),
        ])
    );

// Empty = no email (admin-entered clients often don't have one).
export const optionalEmailSchema = z
    .string()
    .trim()
    .pipe(z.union([z.literal(""), z.email("Neplatný e-mail.")]));
