import NextAuth from "next-auth";
import { authConfig } from "./auth.config.ts";

// Separate, edge-safe NextAuth instance: only the config from auth.config.ts
// (no Prisma/argon2 providers) gets bundled into the proxy. Next.js 16.3's
// proxy-export check only recognizes a default export or a re-exported
// name, not `export const { auth: proxy } = ...` — see
// https://nextjs.org/docs/messages/middleware-to-proxy
export default NextAuth(authConfig).auth;

export const config = {
    matcher: ["/admin/:path*"],
};
