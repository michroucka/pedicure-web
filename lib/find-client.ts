import { prisma } from "@/lib/prisma.ts";
import { normalizePhoneForMatch } from "@/lib/utils.ts";
import type { Client } from "@/lib/generated/prisma/client.ts";

// Single source of the client-matching rule: by phone when there is one,
// otherwise by exact name. Used by findOrCreateClient (on submit) and, as
// a first step, by the booking form's extra-time preview - which on top of
// that requires the name to match too (getExtraMinutesAction), so a phone
// number alone doesn't reveal anything about a client.
// Deliberately includes inactive ("deleted" in admin) clients – skipping
// them would bring back the same-phone/same-name duplicates.
// When duplicates exist (same phone or name), an active client wins over a
// hidden one, then the oldest - otherwise a booking could reactivate an old
// hidden duplicate instead of landing on the client the admin actually sees.
const PREFERRED_MATCH_FIRST = [
    { active: "desc" as const },
    { createdAt: "asc" as const },
];

export async function findClient(
    phone: string | undefined,
    name: string
): Promise<Client | undefined> {
    if (phone) {
        return (
            (await prisma.client.findFirst({
                where: { phoneNormalized: normalizePhoneForMatch(phone) },
                orderBy: PREFERRED_MATCH_FIRST,
            })) ?? undefined
        );
    }
    return (
        (await prisma.client.findFirst({
            where: { name },
            orderBy: PREFERRED_MATCH_FIRST,
        })) ?? undefined
    );
}
