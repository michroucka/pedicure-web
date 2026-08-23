import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import argon2 from "argon2";
import { z } from "zod";
import { prisma } from "@/lib/prisma.ts";

const credentialsSchema = z.object({
    username: z.string().min(1),
    password: z.string().min(1),
});

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
        // it expires, so a deleted/changed AdminUser would stay logged in.
        // This runs on every request and re-validates against the DB,
        // returning null (= logged out) if the account is gone.
        async jwt({ token }) {
            if (!token.sub) return null;

            const admin = await prisma.adminUser.findUnique({
                where: { id: token.sub },
            });
            if (!admin) return null;

            token.name = admin.username;
            token.email = admin.email;
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
