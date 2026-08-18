import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import argon2 from "argon2";
import { z } from "zod";
import { authConfig } from "./auth.config.ts";
import { prisma } from "@/lib/prisma.ts";

const credentialsSchema = z.object({
    username: z.string().min(1),
    password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
    ...authConfig,
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
