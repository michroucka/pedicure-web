import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "./prisma.ts";
import { findClient } from "./find-client.ts";
import { findOrCreateClient } from "./find-or-create-client.ts";

// findClient matches by phone across the whole shared test branch, so
// each test uses its own random number — a fixed one (e.g. "999999999",
// used elsewhere) could match leftovers from other test files.
function uniquePhone(): string {
    return `7${Math.floor(10_000_000 + Math.random() * 89_999_999)}`;
}

describe("findClient / findOrCreateClient", () => {
    const createdIds: string[] = [];

    async function createClient(data: {
        name: string;
        phone?: string;
        extraTimeMinutes?: number;
        active?: boolean;
    }) {
        const client = await prisma.client.create({ data });
        createdIds.push(client.id);
        return client;
    }

    afterEach(async () => {
        await prisma.client.deleteMany({ where: { id: { in: createdIds } } });
        createdIds.length = 0;
    });

    describe("findClient", () => {
        it("matches by phone regardless of formatting and +420 prefix", async () => {
            const phone = uniquePhone();
            const client = await createClient({ name: "Jana Testová", phone });

            const formatted = `+420 ${phone.slice(0, 3)} ${phone.slice(3, 6)} ${phone.slice(6)}`;
            const found = await findClient(formatted, "Jana Testová");

            expect(found?.id).toBe(client.id);
        });

        it("matches by phone even when the name differs", async () => {
            const phone = uniquePhone();
            const client = await createClient({ name: "Jana Testová", phone });

            // e.g. typed without diacritics — the phone is the identity
            const found = await findClient(phone, "Jana Testova");

            expect(found?.id).toBe(client.id);
        });

        it("does not fall back to the name when a phone is given but unknown", async () => {
            await createClient({ name: "Jana Unikátní Testová", phone: uniquePhone() });

            const found = await findClient(uniquePhone(), "Jana Unikátní Testová");

            expect(found).toBeUndefined();
        });

        it("prefers an active client over a hidden duplicate with the same phone", async () => {
            const phone = uniquePhone();
            await createClient({ name: "Starý Skrytý", phone, active: false });
            const active = await createClient({ name: "Aktivní", phone });

            expect((await findClient(phone, "Kdokoli"))?.id).toBe(active.id);
        });

        it("matches by exact name when there is no phone", async () => {
            const name = `Bez Telefonu ${uniquePhone()}`;
            const client = await createClient({ name });

            expect((await findClient(undefined, name))?.id).toBe(client.id);
            expect(await findClient(undefined, `${name} X`)).toBeUndefined();
        });
    });

    describe("findOrCreateClient", () => {
        it("creates a new client when nothing matches", async () => {
            const phone = uniquePhone();

            const client = await findOrCreateClient(phone, "Nová Klientka", "nova@example.com");
            createdIds.push(client.id);

            expect(client.name).toBe("Nová Klientka");
            expect(client.phone).toBe(phone);
            expect(client.email).toBe("nova@example.com");
        });

        it("reuses the client matched by phone instead of creating a duplicate", async () => {
            const phone = uniquePhone();
            const existing = await createClient({ name: "Jana Testová", phone });

            const client = await findOrCreateClient(phone, "Jana Testová");

            expect(client.id).toBe(existing.id);
            expect(await prisma.client.count({ where: { phone } })).toBe(1);
        });

        it("renames a phone-matched client to the latest provided name", async () => {
            const phone = uniquePhone();
            const existing = await createClient({ name: "Jana Testová", phone });

            const client = await findOrCreateClient(phone, "Jana Nová-Testová");

            expect(client.id).toBe(existing.id);
            expect(client.name).toBe("Jana Nová-Testová");
        });

        it("keeps the client's extraTimeMinutes when reusing it", async () => {
            const phone = uniquePhone();
            await createClient({ name: "Jana Testová", phone, extraTimeMinutes: 15 });

            const client = await findOrCreateClient(phone, "Jana Testová");

            expect(client.extraTimeMinutes).toBe(15);
        });
    });
});
