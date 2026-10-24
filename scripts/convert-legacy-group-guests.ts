import "dotenv/config";
import { prisma } from "../lib/prisma.ts";

// Converts group bookings made before Booking.guestName existed, where a
// non-main group member got their own Client: the booking is moved under
// the group's main contact and the member's name goes to guestName. The
// member's Client is then deleted if it has no other bookings left (a
// member who also books on their own stays a regular client).
// Main contact = client of the group's earliest booking, preferring
// CONFIRMED ones (a moved group keeps its groupId, so cancelled originals
// share it with the current bookings).
// Run with --dry-run to preview without writing anything.

const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
    const bookings = await prisma.booking.findMany({
        where: { groupId: { not: null } },
        select: {
            id: true,
            groupId: true,
            clientId: true,
            status: true,
            startTime: true,
            date: true,
            client: { select: { name: true } },
        },
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });

    const byGroup = new Map<string, typeof bookings>();
    for (const b of bookings) {
        const group = byGroup.get(b.groupId!) ?? [];
        group.push(b);
        byGroup.set(b.groupId!, group);
    }

    // guest clientId -> how many of its bookings get moved away
    const movedPerClient = new Map<string, number>();
    let converted = 0;

    for (const [groupId, group] of byGroup) {
        const main = group.find((b) => b.status === "CONFIRMED") ?? group[0];
        const guests = group.filter((b) => b.clientId !== main.clientId);
        if (guests.length === 0) continue;

        console.log(
            `\nSkupina ${groupId} (${main.date.toISOString().slice(0, 10)}), hlavní kontakt: "${main.client.name}"`
        );
        for (const b of guests) {
            console.log(
                `  ${b.status.padEnd(9)} "${b.client.name}" -> guestName, klient ${b.clientId} -> ${main.clientId}`
            );
            movedPerClient.set(
                b.clientId,
                (movedPerClient.get(b.clientId) ?? 0) + 1
            );
            converted++;
        }

        if (!DRY_RUN) {
            await prisma.$transaction(
                guests.map((b) =>
                    prisma.booking.update({
                        where: { id: b.id },
                        data: {
                            clientId: main.clientId,
                            guestName: b.client.name,
                        },
                    })
                )
            );
        }
    }

    if (converted === 0) {
        console.log("Žádné skupiny k převodu.");
        return;
    }

    console.log("\nKlienti hostů:");
    for (const [clientId, moved] of movedPerClient) {
        const client = await prisma.client.findUniqueOrThrow({
            where: { id: clientId },
            select: { name: true },
        });
        // In a dry run the converted bookings still point at this client,
        // so subtract them to get what would stay.
        const count = await prisma.booking.count({ where: { clientId } });
        const remaining = DRY_RUN ? count - moved : count;
        if (remaining === 0) {
            console.log(
                `  "${client.name}" (${clientId}) – žádné další rezervace, smazat`
            );
            if (!DRY_RUN)
                await prisma.client.delete({ where: { id: clientId } });
        } else {
            console.log(
                `  "${client.name}" (${clientId}) – ${remaining} vlastních rezervací, ponechat`
            );
        }
    }

    console.log(`\nPřevedeno rezervací: ${converted}`);
    if (DRY_RUN) {
        console.log(
            "[DRY RUN] Nic nebylo zapsáno. Spusť bez --dry-run pro skutečný převod."
        );
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
