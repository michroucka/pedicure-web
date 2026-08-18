import type { NextAuthConfig } from "next-auth";

// Edge-safe config: no Prisma, no argon2. Consumed by both middleware.ts
// (its own lightweight NextAuth instance) and auth.ts (the full instance).
export const authConfig = {
    pages: {
        signIn: "/admin/login",
    },
    session: {
        strategy: "jwt",
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const isOnLogin = nextUrl.pathname === "/admin/login";

            if (isOnLogin) {
                return isLoggedIn ? Response.redirect(new URL("/admin", nextUrl)) : true;
            }

            return isLoggedIn;
        },
    },
    providers: [],
} satisfies NextAuthConfig;
