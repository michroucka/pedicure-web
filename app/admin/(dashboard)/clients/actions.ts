"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma.ts";

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
            phone: data.phone,
            email: data.email || null,
            extraTimeMinutes: data.extraTimeMinutes,
            note: data.note || null,
        },
    });

    revalidatePath("/admin/clients");
}
