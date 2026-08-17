import { prisma } from "@/lib/prisma.ts";
import type { Client } from "@/lib/generated/prisma/client.ts";

export async function findOrCreateClient(
    phone: string,
    name: string,
    email?: string
): Promise<Client> {
    let client = await prisma.client.findFirst({
        where: { phone: phone, name: name },
    });

    if (!client) {
        client = await prisma.client.create({
            data: { name, phone, email },
        });
    }

    return client;
}
