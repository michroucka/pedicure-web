import { prisma } from "@/lib/prisma.ts";
import { findClient } from "@/lib/find-client.ts";
import type { Client } from "@/lib/generated/prisma/client.ts";

export async function findOrCreateClient(
    phone: string | undefined,
    name: string,
    email?: string,
    note?: string
): Promise<Client> {
    return upsertMatchedClient(
        await findClient(phone, name),
        phone,
        name,
        email,
        note
    );
}

// Re-reads a client looked up earlier by its id (a cheap primary-key
// lookup) - for callers with a gap between findClient and the write (the
// online booking validates the slot in between), during which the admin
// may have deleted or edited that client. Undefined if it's gone.
export async function reloadClient(
    client: Client | undefined
): Promise<Client | undefined> {
    if (!client) return undefined;
    return (
        (await prisma.client.findUnique({ where: { id: client.id } })) ??
        undefined
    );
}

// The write half of findOrCreateClient, for callers that already looked the
// client up with findClient and shouldn't repeat the whole search.
export async function upsertMatchedClient(
    matched: Client | undefined,
    phone: string | undefined,
    name: string,
    email?: string,
    note?: string
): Promise<Client> {
    let client = matched;

    if (!client) {
        client = await prisma.client.create({
            data: { name, phone, email, note },
        });
    } else {
        const changes: {
            name?: string;
            phone?: string;
            email?: string;
            note?: string;
            active?: boolean;
        } = {};
        // The most recently provided email/note wins – e.g. a phone/in-person
        // booking taken by the pedikérka had none, or the client's details
        // simply changed since the last booking.
        if (client.phone && client.name !== name) changes.name = name;
        if (phone && !client.phone) changes.phone = phone;
        if (email && email !== client.email) changes.email = email;
        if (note && note !== client.note) changes.note = note;
        // A "deleted" (hidden) client who books again is back – matched on
        // purpose instead of creating a duplicate with the same phone/name.
        if (!client.active) changes.active = true;
        if (Object.keys(changes).length > 0) {
            client = await prisma.client.update({
                where: { id: client.id },
                data: changes,
            });
        }
    }

    return client;
}
