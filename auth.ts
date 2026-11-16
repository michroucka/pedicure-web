import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authorizeAdmin, revalidateAdminToken } from "@/lib/admin-auth";

export const { handlers, auth, signIn, signOut } = NextAuth({
    pages: {
        signIn: "/login",
    },
    session: {
        strategy: "jwt",
    },
    callbacks: {
        jwt: ({ token }) => revalidateAdminToken(token),
    },
    providers: [
        Credentials({
            credentials: {
                username: {},
                password: {},
            },
            authorize: authorizeAdmin,
        }),
    ],
});
