import { afterEach, beforeEach, describe, expect, it } from "vitest";
import argon2 from "argon2";
import type { JWT } from "next-auth/jwt";
import { prisma } from "./prisma";
import {
    authorizeAdmin,
    passwordFingerprint,
    revalidateAdminToken,
} from "./admin-auth";

const PASSWORD = "spravne-heslo-123";

describe("admin auth", () => {
    let admin: { id: string; username: string; email: string };
    let passwordHash: string;

    beforeEach(async () => {
        const suffix = crypto.randomUUID().slice(0, 8);
        passwordHash = await argon2.hash(PASSWORD);
        admin = await prisma.adminUser.create({
            data: {
                username: `test-admin-${suffix}`,
                email: `test-admin-${suffix}@example.test`,
                passwordHash,
            },
        });
    });

    afterEach(async () => {
        await prisma.adminUser.deleteMany({ where: { id: admin.id } });
    });

    describe("authorizeAdmin", () => {
        it("returns the user for the right username and password", async () => {
            expect(
                await authorizeAdmin({
                    username: admin.username,
                    password: PASSWORD,
                })
            ).toEqual({
                id: admin.id,
                name: admin.username,
                email: admin.email,
            });
        });

        it("rejects a wrong password", async () => {
            expect(
                await authorizeAdmin({
                    username: admin.username,
                    password: "spatne-heslo",
                })
            ).toBeNull();
        });

        it("rejects an unknown username", async () => {
            expect(
                await authorizeAdmin({
                    username: "neexistujici-admin",
                    password: PASSWORD,
                })
            ).toBeNull();
        });

        it("rejects missing or oversized credentials without a DB lookup", async () => {
            expect(await authorizeAdmin({})).toBeNull();
            expect(
                await authorizeAdmin({ username: admin.username, password: "" })
            ).toBeNull();
            expect(
                await authorizeAdmin({
                    username: admin.username,
                    password: "x".repeat(257),
                })
            ).toBeNull();
        });
    });

    describe("revalidateAdminToken", () => {
        function issuedToken(overrides: Partial<JWT> = {}): JWT {
            return {
                sub: admin.id,
                name: admin.username,
                email: admin.email,
                pwFingerprint: passwordFingerprint(passwordHash),
                ...overrides,
            };
        }

        it("adds the password fingerprint on the first call after sign-in", async () => {
            const token = await revalidateAdminToken(
                issuedToken({ pwFingerprint: undefined })
            );

            expect(token?.pwFingerprint).toBe(
                passwordFingerprint(passwordHash)
            );
        });

        it("keeps a session whose account hasn't changed", async () => {
            expect(await revalidateAdminToken(issuedToken())).not.toBeNull();
        });

        it("logs out a token without a subject", async () => {
            expect(
                await revalidateAdminToken(issuedToken({ sub: undefined }))
            ).toBeNull();
        });

        it("logs out when the account was deleted", async () => {
            await prisma.adminUser.delete({ where: { id: admin.id } });

            expect(await revalidateAdminToken(issuedToken())).toBeNull();
        });

        it("logs out after a password change", async () => {
            await prisma.adminUser.update({
                where: { id: admin.id },
                data: { passwordHash: await argon2.hash("nove-heslo-456") },
            });

            expect(await revalidateAdminToken(issuedToken())).toBeNull();
        });

        it("logs out after a username or email change", async () => {
            await prisma.adminUser.update({
                where: { id: admin.id },
                data: { email: `changed-${admin.email}` },
            });
            expect(await revalidateAdminToken(issuedToken())).toBeNull();

            await prisma.adminUser.update({
                where: { id: admin.id },
                data: {
                    email: admin.email,
                    username: `${admin.username}-changed`,
                },
            });
            expect(await revalidateAdminToken(issuedToken())).toBeNull();
        });
    });
});
