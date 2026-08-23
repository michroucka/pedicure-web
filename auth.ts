import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import argon2 from "argon2";
import { createHash } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma.ts";

declare module "@auth/core/jwt" {
    interface JWT {
        // Fingerprint of the AdminUser's passwordHash at the time this
        // token was issued/last confirmed — lets the jwt callback detect
        // a password change without ever putting the real hash in the
        // token. Undefined only on the very first call, right after sign-in.
        pwFingerprint?: string;
    }
}

const credentialsSchema = z.object({
    username: z.string().min(1),
    password: z.string().min(1),
});

function passwordFingerprint(passwordHash: string) {
    return createHash("sha256").update(passwordHash).digest("hex");
}

export const { handlers, auth, signIn, signOut } = NextAuth({
    pages: {
        signIn: "/login",
    },
    session: {
        strategy: "jwt",
    },
    callbacks: {
        // With the jwt strategy, sessions aren't checked against the
        // database by default — the signed cookie alone is trusted until
        // it expires, so a deleted or edited AdminUser had no effect on
        // an already-issued session. This runs on every request and
        // re-validates against the DB: logged out (null) if the account
        // is gone, or if its username/email/password changed since this
        // token was issued — an existing session shouldn't silently pick
        // up a changed account, it should have to log in again.
        async jwt({ token }) {
            if (!token.sub) {
                console.log("[jwt] no token.sub, invalidating");
                return null;
            }

            const admin = await prisma.adminUser.findUnique({
                where: { id: token.sub },
            });
            if (!admin) {
                console.log("[jwt] no admin found for id", token.sub);
                return null;
            }

            const currentFingerprint = passwordFingerprint(admin.passwordHash);
            const changedSinceIssued =
                token.pwFingerprint !== undefined &&
                (token.name !== admin.username ||
                    token.email !== admin.email ||
                    token.pwFingerprint !== currentFingerprint);

            console.log("[jwt] check", {
                sub: token.sub,
                tokenName: token.name,
                dbUsername: admin.username,
                tokenEmail: token.email,
                dbEmail: admin.email,
                hadFingerprint: token.pwFingerprint !== undefined,
                fingerprintMatch: token.pwFingerprint === currentFingerprint,
                changedSinceIssued,
            });

            if (changedSinceIssued) {
                console.log("[jwt] invalidating — account changed since token issued");
                return null;
            }

            token.name = admin.username;
            token.email = admin.email;
            token.pwFingerprint = currentFingerprint;
            return token;
        },
    },
    providers: [
        Credentials({
            credentials: {
                username: {},
                password: {},
            },
            async authorize(credentials) {
                const parsed = credentialsSchema.safeParse(credentials);
                if (!parsed.success) return null;

                const admin = await prisma.adminUser.findUnique({
                    where: { username: parsed.data.username },
                });
                if (!admin) return null;

                const valid = await argon2.verify(
                    admin.passwordHash,
                    parsed.data.password
                );
                if (!valid) return null;

                return { id: admin.id, name: admin.username, email: admin.email };
            },
        }),
    ],
});
