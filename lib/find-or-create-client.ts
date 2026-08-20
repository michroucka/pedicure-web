import { prisma } from "@/lib/prisma.ts";
import { normalizePhoneForMatch } from "@/lib/utils.ts";
import type { Client } from "@/lib/generated/prisma/client.ts";

export async function findOrCreateClient(
    phone: string,
    name: string,
    email?: string
): Promise<Client> {
    const candidates = await prisma.client.findMany({ where: { name } });
    const normalizedPhone = normalizePhoneForMatch(phone);
    let client = candidates.find(
        (c) => normalizePhoneForMatch(c.phone) === normalizedPhone
    );

    if (!client) {
        client = await prisma.client.create({
            data: { name, phone, email },
        });
    } else if (email && email !== client.email) {
        // The most recently provided email wins — e.g. a phone/in-person
        // booking taken by the pedikérka had none, or the client's address
        // simply changed since the last booking.
        client = await prisma.client.update({
            where: { id: client.id },
            data: { email },
        });
    }

    return client;
}
