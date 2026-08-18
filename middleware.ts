import NextAuth from "next-auth";
import { authConfig } from "./auth.config.ts";

// Separate, edge-safe NextAuth instance: only the config from auth.config.ts
// (no Prisma/argon2 providers) gets bundled into the middleware.
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
    matcher: ["/admin/:path*"],
};
