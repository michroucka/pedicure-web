import { prisma } from "@/lib/prisma.ts";
import { normalizePhoneForMatch } from "@/lib/utils.ts";
import type { Client } from "@/lib/generated/prisma/client.ts";

// Single source of the client-matching rule: by phone when there is one,
// otherwise by exact name. Shared by findOrCreateClient (on submit) and the
// booking form's extra-time preview, so the two can never disagree.
// Deliberately includes inactive ("deleted" in admin) clients — skipping
// them would bring back the same-phone/same-name duplicates.
export async function findClient(
    phone: string | undefined,
    name: string
): Promise<Client | undefined> {
    if (phone) {
        const normalizedPhone = normalizePhoneForMatch(phone);
        const candidates = await prisma.client.findMany({ where: { phone: { not: null } } });
        return candidates.find((c) => normalizePhoneForMatch(c.phone!) === normalizedPhone);
    }
    return (await prisma.client.findFirst({ where: { name } })) ?? undefined;
}
