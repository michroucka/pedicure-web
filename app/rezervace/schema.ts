import { z } from "zod";
import {
    nameSchema,
    PHONE_RE,
    serviceIdsSchema,
    startTimeSchema,
} from "@/lib/validation.ts";
import { HORIZON_DAYS } from "@/lib/booking-horizon.ts";

export const soloDataSchema = z.object({
    name: nameSchema,
    phone: z.string().trim().regex(PHONE_RE, "Zadejte platné telefonní číslo"),
    email: z.string().trim().pipe(z.email("Zadejte platný email")),
});

export const soloContextSchema = z.object({
    date: z.date(),
    serviceId: z.int().positive(),
    startTime: startTimeSchema,
});

export const groupDataSchema = soloDataSchema.omit({ name: true }).extend({
    names: z.array(nameSchema).min(2).max(4),
});

export const groupContextSchema = soloContextSchema
    .omit({ serviceId: true })
    .extend({
        serviceIds: serviceIdsSchema.min(2),
    });

// The pickers ask for at most HORIZON_DAYS at once (a month grid outside
// it is 42 days); a little slack on top so day rounding never rejects a
// legit request. Without a cap one request could make the server compute
// availability for years of days.
const MAX_DAY_RANGE_DAYS = HORIZON_DAYS + 7;
const DAY_MS = 24 * 60 * 60 * 1000;

export const dateRangeSchema = z
    .object({
        from: z.date(),
        to: z.date(),
    })
    .refine((r) => r.from <= r.to, {
        message: "Konec rozsahu musí být po jeho začátku.",
    })
    .refine(
        (r) => r.to.getTime() - r.from.getTime() <= MAX_DAY_RANGE_DAYS * DAY_MS,
        {
            message: "Příliš dlouhý rozsah.",
        }
    );

// Looked up while the form is still being typed – empty or half-written
// values are fine here (no nameSchema / PHONE_RE), just bounded.
export const contactLookupSchema = z.object({
    name: z.string().trim().max(100),
    phone: z.string().trim().max(30),
});
