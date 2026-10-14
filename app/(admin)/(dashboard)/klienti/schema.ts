import { z } from "zod";
import {
    adminPhoneSchema,
    nameSchema,
    noteSchema,
    optionalEmailSchema,
} from "@/lib/validation.ts";

export const updateClientInputSchema = z.object({
    name: nameSchema,
    phone: adminPhoneSchema,
    email: optionalEmailSchema,
    // normalized to a multiple of 5 by normalizeExtraMinutes in the action
    extraTimeMinutes: z.number().max(600),
    note: noteSchema,
});
