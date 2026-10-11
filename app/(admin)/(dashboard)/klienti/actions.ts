"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma.ts";
import { normalizeExtraMinutes } from "@/lib/extra-time.ts";

export async function updateClientAction(
    id: string,
    data: {
        name: string;
        phone: string;
        email: string;
        extraTimeMinutes: number;
        note: string;
    }
) {
    await prisma.client.update({
        where: { id },
        data: {
            name: data.name,
            phone: data.phone || null,
            email: data.email || null,
            extraTimeMinutes: normalizeExtraMinutes(data.extraTimeMinutes),
            note: data.note || null,
        },
    });

    revalidatePath("/klienti");
}
