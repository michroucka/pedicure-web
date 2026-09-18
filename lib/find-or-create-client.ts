import { prisma } from "@/lib/prisma.ts";
import { normalizePhoneForMatch } from "@/lib/utils.ts";
import type { Client } from "@/lib/generated/prisma/client.ts";

export async function findOrCreateClient(
    phone: string | undefined,
    name: string,
    email?: string
): Promise<Client> {
    // No phone to match on — matching by name alone risks silently merging
    // two different people who happen to share a name, so treat this as a
    // new client every time rather than guessing.
    let client: Client | undefined;
    if (phone) {
        const normalizedPhone = normalizePhoneForMatch(phone);
        const candidates = await prisma.client.findMany({ where: { name } });
        client = candidates.find(
            (c) => c.phone && normalizePhoneForMatch(c.phone) === normalizedPhone
        );
    }

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
