import { z } from "zod";
import { PHONE_RE } from "@/lib/validation.ts";

const nameSchema = z.string().trim().min(1, "Jméno je povinné").max(100);

export const soloDataSchema = z.object({
    name: nameSchema,
    phone: z.string().trim().regex(PHONE_RE, "Zadejte platné telefonní číslo"),
    email: z.string().trim().pipe(z.email("Zadejte platný email")),
});

export const soloContextSchema = z.object({
    date: z.date(),
    serviceId: z.int().positive(),
    startTime: z.int().min(0).max(1439),
});

export const groupDataSchema = soloDataSchema
    .omit({ name: true })
    .extend({
        names: z.array(nameSchema).min(2).max(4),
    });

export const groupContextSchema = soloContextSchema
    .omit({ serviceId: true })
    .extend({
        serviceIds: z.array(z.int().positive()).min(2).max(4),
    });