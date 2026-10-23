import { prisma } from "@/lib/prisma.ts";
import { normalizePhoneForMatch } from "@/lib/utils.ts";
import type { Client } from "@/lib/generated/prisma/client.ts";

// Single source of the client-matching rule: by phone when there is one,
// otherwise by exact name. Used by findOrCreateClient (on submit) and, as
// a first step, by the booking form's extra-time preview - which on top of
// that requires the name to match too (getExtraMinutesAction), so a phone
// number alone doesn't reveal anything about a client.
// Deliberately includes inactive ("deleted" in admin) clients — skipping
// them would bring back the same-phone/same-name duplicates.
export async function findClient(
    phone: string | undefined,
    name: string
): Promise<Client | undefined> {
    if (phone) {
        return (
            (await prisma.client.findFirst({
                where: { phoneNormalized: normalizePhoneForMatch(phone) },
                orderBy: { createdAt: "asc" },
            })) ?? undefined
        );
    }
    return (await prisma.client.findFirst({ where: { name } })) ?? undefined;
}
