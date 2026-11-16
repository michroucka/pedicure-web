import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import argon2 from "argon2";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { signOut } from "@/auth";
import {
    changePasswordAction,
    deletePushSubscriptionAction,
    savePushSubscriptionAction,
} from "./actions";

vi.mock("@/lib/require-admin", () => ({ requireAdmin: vi.fn() }));
vi.mock("@/auth", () => ({ signOut: vi.fn() }));

const PASSWORD = "stare-heslo-123";

function passwordForm(fields: Record<string, string>) {
    const formData = new FormData();
    for (const [key, value] of Object.entries(fields)) {
        formData.set(key, value);
    }
    return formData;
}

describe("nastaveni actions", () => {
    let admin: { id: string; username: string };

    beforeEach(async () => {
        const suffix = crypto.randomUUID().slice(0, 8);
        admin = await prisma.adminUser.create({
            data: {
                username: `test-nastaveni-${suffix}`,
                email: `test-nastaveni-${suffix}@example.test`,
                passwordHash: await argon2.hash(PASSWORD),
            },
        });
        vi.mocked(requireAdmin).mockResolvedValue(admin.username);
    });

    afterEach(async () => {
        vi.clearAllMocks();
        await prisma.pushSubscription.deleteMany({
            where: { adminUserId: admin.id },
        });
        await prisma.adminUser.delete({ where: { id: admin.id } });
    });

    async function storedHash() {
        const row = await prisma.adminUser.findUniqueOrThrow({
            where: { id: admin.id },
        });
        return row.passwordHash;
    }

    describe("changePasswordAction", () => {
        it("stores the new password and signs the admin out", async () => {
            const result = await changePasswordAction(
                null,
                passwordForm({
                    currentPassword: PASSWORD,
                    newPassword: "nove-heslo-456",
                    confirmPassword: "nove-heslo-456",
                })
            );

            expect(result).toBeNull();
            expect(
                await argon2.verify(await storedHash(), "nove-heslo-456")
            ).toBe(true);
            expect(signOut).toHaveBeenCalledWith({
                redirectTo: "/login?passwordChanged=1",
            });
        });

        it.each([
            [
                "wrong current password",
                {
                    currentPassword: "spatne",
                    newPassword: "nove-heslo-456",
                    confirmPassword: "nove-heslo-456",
                },
                "Současné heslo není správné.",
            ],
            [
                "mismatched confirmation",
                {
                    currentPassword: PASSWORD,
                    newPassword: "nove-heslo-456",
                    confirmPassword: "jine-heslo-789",
                },
                "Hesla se neshodují.",
            ],
            [
                "too short new password",
                {
                    currentPassword: PASSWORD,
                    newPassword: "kratke",
                    confirmPassword: "kratke",
                },
                "Nové heslo musí mít alespoň 8 znaků.",
            ],
        ])("keeps the old password on %s", async (_, fields, error) => {
            const result = await changePasswordAction(
                null,
                passwordForm(fields)
            );

            expect(result).toEqual({ ok: false, error });
            expect(await argon2.verify(await storedHash(), PASSWORD)).toBe(
                true
            );
            expect(signOut).not.toHaveBeenCalled();
        });
    });

    describe("push subscriptions", () => {
        const subscription = {
            endpoint: `https://push.example.test/${crypto.randomUUID()}`,
            p256dh: "p256dh-key",
            auth: "auth-secret",
            userAgent: "Test tablet",
        };

        it("saves a subscription and updates it on re-subscribe instead of duplicating", async () => {
            await savePushSubscriptionAction(subscription);
            await savePushSubscriptionAction({
                ...subscription,
                p256dh: "new-key",
            });

            const rows = await prisma.pushSubscription.findMany({
                where: { endpoint: subscription.endpoint },
            });
            expect(rows).toHaveLength(1);
            expect(rows[0]).toMatchObject({
                adminUserId: admin.id,
                p256dh: "new-key",
            });
        });

        it("rejects an endpoint that isn't https", async () => {
            const result = await savePushSubscriptionAction({
                ...subscription,
                endpoint: "http://push.example.test/insecure",
            });

            expect(result).toEqual({
                ok: false,
                error: "Neplatné údaje o zařízení.",
            });
            expect(
                await prisma.pushSubscription.count({
                    where: { adminUserId: admin.id },
                })
            ).toBe(0);
        });

        it("deletes a subscription by its endpoint", async () => {
            await savePushSubscriptionAction(subscription);

            await deletePushSubscriptionAction(subscription.endpoint);

            expect(
                await prisma.pushSubscription.count({
                    where: { endpoint: subscription.endpoint },
                })
            ).toBe(0);
        });
    });
});
