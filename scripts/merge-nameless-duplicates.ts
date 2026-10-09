import "dotenv/config";
import { prisma } from "../lib/prisma.ts";

// Merges clients with no phone that share an exact (case-sensitive) name.
// Strategy: keep the oldest record, move its duplicates' bookings onto it,
// then delete the duplicates.
// Run with --dry-run to preview without writing anything.

const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
    const nameless = await prisma.client.findMany({
        where: { phone: null },
        orderBy: { createdAt: "asc" },
    });

    const byName = new Map<string, typeof nameless>();
    for (const c of nameless) {
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
        const [primary, ...rest] = group; // oldest first (ordered by createdAt)
        const restIds = rest.map((c) => c.id);

        console.log(`\nJméno: "${primary.name}"`);
        console.log(`  Ponechat:  ${primary.id} (${primary.createdAt.toISOString()})`);
        for (const c of rest) {
            const bookingCount = await prisma.booking.count({ where: { clientId: c.id } });
            console.log(`  Sloučit:   ${c.id} (${c.createdAt.toISOString()}) — ${bookingCount} rezervací`);
        }

        if (!DRY_RUN) {
            await prisma.booking.updateMany({
                where: { clientId: { in: restIds } },
                data: { clientId: primary.id },
            });

            // Merge email/note from duplicates onto primary if primary is missing them
            const emailFallback = rest.find((c) => c.email)?.email;
            const noteFallback = rest.find((c) => c.note)?.note;
            const updates: { email?: string; note?: string } = {};
            if (!primary.email && emailFallback) updates.email = emailFallback;
            if (!primary.note && noteFallback) updates.note = noteFallback;
            if (Object.keys(updates).length > 0) {
                await prisma.client.update({ where: { id: primary.id }, data: updates });
                console.log(`  Doplněno na primary: ${JSON.stringify(updates)}`);
            }

            await prisma.client.deleteMany({ where: { id: { in: restIds } } });
            console.log(`  Sloučeno.`);
        }
    }

    if (DRY_RUN) {
        console.log("\n[DRY RUN] Nic nebylo zapsáno. Spusť bez --dry-run pro skutečné sloučení.");
    }
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
