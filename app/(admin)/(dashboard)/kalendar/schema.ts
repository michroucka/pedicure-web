import { z } from "zod";
import {
    adminPhoneSchema,
    dateStrSchema,
    idSchema,
    nameSchema,
    noteSchema,
    optionalEmailSchema,
    startTimeSchema,
} from "@/lib/validation.ts";

// Normalized by normalizeExtraMinutes in the actions — only the type and a
// sane upper bound are checked here.
const extraMinutesSchema = z.number().max(600);

const serviceIdSchema = z.int().positive();

export const moveSlotsInputSchema = z.object({
    id: idSchema,
    groupId: idSchema.nullable(),
    dateStr: dateStrSchema,
    overrideServiceIds: z.array(serviceIdSchema).min(1).max(4).optional(),
    overrideExtraMinutes: z.array(extraMinutesSchema).min(1).max(4).optional(),
});

export const updateBookingInputSchema = z.object({
    groupId: idSchema.nullable(),
    people: z
        .array(
            z.object({
                bookingId: idSchema,
                name: nameSchema,
                serviceId: serviceIdSchema,
                extraTimeMinutes: extraMinutesSchema,
            })
        )
        .min(1)
        .max(4),
    phone: adminPhoneSchema,
    note: noteSchema,
    dateStr: dateStrSchema,
    startTime: startTimeSchema,
    outsideHours: z.boolean().optional(),
});

export const manualBookingSlotsInputSchema = z.object({
    serviceIds: z.array(serviceIdSchema).min(1).max(4),
    dateStr: dateStrSchema,
    extraMinutes: extraMinutesSchema,
});

export const createManualBookingInputSchema = z.object({
    phone: adminPhoneSchema.optional(),
    email: optionalEmailSchema.optional(),
    note: noteSchema.optional(),
    people: z
        .array(
            z.object({
                name: nameSchema,
                serviceId: serviceIdSchema,
                extraTimeMinutes: extraMinutesSchema,
            })
        )
        .min(1)
        .max(4),
    dateStr: dateStrSchema,
    startTime: startTimeSchema,
    source: z.enum(["PHONE", "IN_PERSON"]),
    outsideHours: z.boolean().optional(),
});
