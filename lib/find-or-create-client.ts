import { prisma } from "@/lib/prisma.ts";
import { normalizePhoneForMatch } from "@/lib/utils.ts";
import type { Client } from "@/lib/generated/prisma/client.ts";

export async function findOrCreateClient(
    phone: string | undefined,
    name: string,
    email?: string,
    note?: string
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
            data: { name, phone, email, note },
        });
    } else {
        const changes: { email?: string; note?: string } = {};
        // The most recently provided email/note wins — e.g. a phone/in-person
        // booking taken by the pedikérka had none, or the client's details
        // simply changed since the last booking.
        if (email && email !== client.email) changes.email = email;
        if (note && note !== client.note) changes.note = note;
        if (Object.keys(changes).length > 0) {
            client = await prisma.client.update({
                where: { id: client.id },
                data: changes,
            });
        }
    }

    return client;
}
