import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth.ts";

// Domain-based routing: the admin routes (kalendar/dostupnost/klienti/login)
// have no shared URL prefix, so they only make sense reachable through
// admin.pedikurakralovice.cz. This has to happen before Next.js resolves a
// route at all, based on the Host header — a layout can't do that (it runs
// after routing).
//
// The auth gate lives here too, not just in the dashboard layout. Next.js
// caches shared layouts across client-side navigation (clicking between
// /kalendar, /dostupnost, /klienti doesn't re-run the layout, only the page
// segment), so a layout-only check misses a session that was invalidated
// (account deleted/edited) after the layout last rendered — it only catches
// up on a hard reload. Proxy runs on every request, including soft
// navigation, so it doesn't have that gap. (Next.js 16 always runs proxy on
// the Node.js runtime, not Edge, so calling the full auth() — Prisma and
// all — here is fine; no edge-safe config split needed.)
const MAIN_HOST = "pedikurakralovice.cz";
const ADMIN_HOST = "admin.pedikurakralovice.cz";

const ADMIN_PATHS = ["/kalendar", "/dostupnost", "/klienti", "/login"];
const PROTECTED_PATHS = ["/kalendar", "/dostupnost", "/klienti"];

function matchesPath(pathname: string, paths: string[]) {
    return paths.some(
        (path) => pathname === path || pathname.startsWith(`${path}/`)
    );
}

export default async function proxy(request: NextRequest) {
    const host = request.headers.get("host") ?? "";
    const { pathname } = request.nextUrl;

    const isAdminHost = host === ADMIN_HOST || host === `www.${ADMIN_HOST}`;
    const isMainHost = host === MAIN_HOST || host === `www.${MAIN_HOST}`;

    if (isAdminHost && pathname === "/") {
        return NextResponse.redirect(new URL("/kalendar", request.url));
    }

    if (isMainHost && matchesPath(pathname, ADMIN_PATHS)) {
        return NextResponse.redirect(
            new URL(`https://${ADMIN_HOST}${pathname}`, request.url)
        );
    }

    if (matchesPath(pathname, PROTECTED_PATHS)) {
        const session = await auth();
        console.log("[proxy] auth check", {
            pathname,
            hasSession: !!session,
            user: session?.user ?? null,
        });
        if (!session?.user) {
            return NextResponse.redirect(new URL("/login", request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!_next|.*\\..*).*)"],
};
