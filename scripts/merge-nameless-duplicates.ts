import "dotenv/config";
import { prisma } from "../lib/prisma.ts";
import { normalizePhoneForMatch } from "../lib/utils.ts";
import type { Client } from "../lib/generated/prisma/client.ts";

// Merges clients that share an exact (case-sensitive) name, as long as
// they can't be two different people: within one name, all clients without
// a phone plus at most one distinct phone number. Two different phones
// under one name are two real people – those names are skipped (reported).
// Strategy: keep the client with the phone if there is one, otherwise the
// oldest record; move the duplicates' bookings onto it, carry over the
// phone/email/note/extraTimeMinutes it's missing, then delete the
// duplicates.
// Run with --dry-run to preview without writing anything.

const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
    const clients = await prisma.client.findMany({
        orderBy: { createdAt: "asc" },
    });

    const byName = new Map<string, Client[]>();
    for (const c of clients) {
        const group = byName.get(c.name) ?? [];
        group.push(c);
        byName.set(c.name, group);
    }

    const duplicateGroups = [...byName.values()].filter((g) => g.length > 1);

    if (duplicateGroups.length === 0) {
        console.log("Žádné duplicity nenalezeny.");
        return;
    }

    for (const group of duplicateGroups) {
        const phones = new Set(
            group
                .filter((c) => c.phone)
                .map((c) => normalizePhoneForMatch(c.phone!))
        );
        if (phones.size > 1) {
            console.log(
                `\nJméno: "${group[0].name}" – ${phones.size} různé telefony, různí lidé, přeskočeno`
            );
            continue;
        }

        // oldest first (ordered by createdAt), but the one with a phone wins
        const primary = group.find((c) => c.phone) ?? group[0];
        const rest = group.filter((c) => c.id !== primary.id);
        const restIds = rest.map((c) => c.id);

        console.log(`\nJméno: "${primary.name}"`);
        console.log(
            `  Ponechat:  ${primary.id} (${primary.createdAt.toISOString()})${primary.phone ? ` tel. ${primary.phone}` : ""}`
        );
        for (const c of rest) {
            const bookingCount = await prisma.booking.count({
                where: { clientId: c.id },
            });
            console.log(
                `  Sloučit:   ${c.id} (${c.createdAt.toISOString()})${c.phone ? ` tel. ${c.phone}` : ""} – ${bookingCount} rezervací`
            );
        }

        // Fill in whatever the primary is missing from its duplicates
        const updates: {
            phone?: string;
            email?: string;
            note?: string;
            extraTimeMinutes?: number;
        } = {};
        const phoneFallback = rest.find((c) => c.phone)?.phone;
        const emailFallback = rest.find((c) => c.email)?.email;
        const noteFallback = rest.find((c) => c.note)?.note;
        const maxExtraTime = Math.max(...group.map((c) => c.extraTimeMinutes));
        if (!primary.phone && phoneFallback) updates.phone = phoneFallback;
        if (!primary.email && emailFallback) updates.email = emailFallback;
        if (!primary.note && noteFallback) updates.note = noteFallback;
        if (maxExtraTime > primary.extraTimeMinutes)
            updates.extraTimeMinutes = maxExtraTime;
        if (Object.keys(updates).length > 0) {
            console.log(`  Doplnit na primary: ${JSON.stringify(updates)}`);
        }

        if (!DRY_RUN) {
            await prisma.$transaction([
                prisma.booking.updateMany({
                    where: { clientId: { in: restIds } },
                    data: { clientId: primary.id },
                }),
                prisma.client.update({
                    where: { id: primary.id },
                    data: updates,
                }),
                prisma.client.deleteMany({ where: { id: { in: restIds } } }),
            ]);
            console.log(`  Sloučeno.`);
        }
    }

    if (DRY_RUN) {
        console.log(
            "\n[DRY RUN] Nic nebylo zapsáno. Spusť bez --dry-run pro skutečné sloučení."
        );
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
