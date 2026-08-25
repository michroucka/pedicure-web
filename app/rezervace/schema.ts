import { z } from "zod";

export const soloSchema = z.object({
    name: z.string().min(1, "Jméno je povinné"),
    phone: z.string().min(9, "Zadejte platné telefonní číslo"),
    email: z.email("Zadejte platný email"),
});

export const groupSchema = z.object({
    names: z.array(z.string().min(1, "Jméno je povinné")),
    phone: z.string().min(9, "Zadejte platné telefonní číslo"),
    email: z.email("Zadejte platný email"),
});