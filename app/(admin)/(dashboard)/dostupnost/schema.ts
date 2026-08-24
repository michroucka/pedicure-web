import { z } from "zod";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export const blockSchema = z
    .object({
        startTime: z.string().regex(TIME_RE, "Neplatný čas"),
        endTime: z.string().regex(TIME_RE, "Neplatný čas"),
    })
    .refine((b) => b.startTime < b.endTime, {
        message: "Konec musí být po začátku",
        path: ["endTime"],
    });

export const daySchema = z.object({
    dayOfWeek: z.number().min(0).max(6),
    blocks: z.array(blockSchema),
});

export const availabilitySchema = z.object({
    days: z.array(daySchema).length(7),
});

export type AvailabilityFormData = z.infer<typeof availabilitySchema>;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const exceptionSchema = z.discriminatedUnion("kind", [
    z.object({
        kind: z.literal("BLOCKED_ALL_DAY"),
        date: z.string().regex(DATE_RE),
    }),
    z
        .object({
            kind: z.literal("BLOCKED_PARTIAL"),
            date: z.string().regex(DATE_RE),
            startTime: z.string().regex(TIME_RE, "Neplatný čas"),
            endTime: z.string().regex(TIME_RE, "Neplatný čas"),
        })
        .refine((e) => e.startTime < e.endTime, {
            message: "Konec musí být po začátku",
            path: ["endTime"],
        }),
    z
        .object({
            kind: z.literal("EXTRA_OPEN"),
            date: z.string().regex(DATE_RE),
            startTime: z.string().regex(TIME_RE, "Neplatný čas"),
            endTime: z.string().regex(TIME_RE, "Neplatný čas"),
        })
        .refine((e) => e.startTime < e.endTime, {
            message: "Konec musí být po začátku",
            path: ["endTime"],
        }),
]);

export type ExceptionFormData = z.infer<typeof exceptionSchema>;
export type ExceptionKind = ExceptionFormData["kind"];

export const editExceptionSchema = z
    .object({
        id: z.string().min(1),
        startTime: z.string().regex(TIME_RE, "Neplatný čas"),
        endTime: z.string().regex(TIME_RE, "Neplatný čas"),
    })
    .refine((e) => e.startTime < e.endTime, {
        message: "Konec musí být po začátku",
        path: ["endTime"],
    });

export type EditExceptionFormData = z.infer<typeof editExceptionSchema>;
