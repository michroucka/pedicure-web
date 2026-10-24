import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "./prisma.ts";
import { normalizePhoneForMatch } from "./utils.ts";

// Client.phoneNormalized is a generated column with its own SQL copy of
// normalizePhoneForMatch (migration 20261023200000_client_phone_normalized).
// findClient queries the column with the TS version of the same rule, so
// the two must agree on every format phones actually come in.
describe("Client.phoneNormalized", () => {
    const createdIds: string[] = [];

    afterEach(async () => {
        await prisma.client.deleteMany({ where: { id: { in: createdIds } } });
        createdIds.length = 0;
    });

    it.each([
        "739 665 010",
        "739665010",
        "+420 739 665 010",
        "+420739665010",
        "420739665010",
        "00420 739 665 010",
        "+421 905 123 456",
        "420 123",
        "(739) 665-010",
    ])("matches normalizePhoneForMatch for %j", async (phone) => {
        const client = await prisma.client.create({
            data: { name: "Test Normalizace", phone },
        });
        createdIds.push(client.id);

        expect(client.phoneNormalized).toBe(normalizePhoneForMatch(phone));
    });

    it("follows a phone change and stays null without a phone", async () => {
        const client = await prisma.client.create({
            data: { name: "Test Normalizace" },
        });
        createdIds.push(client.id);
        expect(client.phoneNormalized).toBeNull();

        const updated = await prisma.client.update({
            where: { id: client.id },
            data: { phone: "+420 777 888 999" },
        });
        expect(updated.phoneNormalized).toBe("777888999");
    });
});
