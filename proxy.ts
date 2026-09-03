import { NextResponse } from "next/server";
import type { NextFetchEvent, NextRequest } from "next/server";
import { auth } from "@/auth.ts";
import type { NextAuthRequest } from "next-auth";
import { BOOKING_ENABLED } from "@/lib/booking-enabled.ts";

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
//
// auth() has to be called through its own auth(request => ...) wrapper, not
// as a bare `await auth()` — only the wrapper can attach the refreshed
// session cookie to the response it returns. A bare call can read the
// session fine, but any Set-Cookie it would have issued (e.g. the jwt
// callback's rolling re-validation) is silently dropped when returned
// inside a NextResponse we built ourselves, so the token never actually
// updates — every request looks like the very first one after sign-in.
const MAIN_HOST = "pedikurakralovice.cz";
const ADMIN_HOST = "admin.pedikurakralovice.cz";

const ADMIN_PATHS = [
    "/kalendar",
    "/dostupnost",
    "/klienti",
    "/login",
    "/nastaveni",
];
const PROTECTED_PATHS = ["/kalendar", "/dostupnost", "/klienti", "/nastaveni"];

function matchesPath(pathname: string, paths: string[]) {
    return paths.some(
        (path) => pathname === path || pathname.startsWith(`${path}/`)
    );
}

const checkSession = auth((req: NextAuthRequest, _event: NextFetchEvent) => {
    if (!req.auth?.user) {
        return NextResponse.redirect(new URL("/login", req.url));
    }
    return NextResponse.next();
});

export default async function proxy(
    request: NextRequest,
    event: NextFetchEvent
) {
    const host = request.headers.get("host") ?? "";
    const { pathname } = request.nextUrl;

    const isAdminHost = host === ADMIN_HOST || host === `www.${ADMIN_HOST}`;
    const isMainHost = host === MAIN_HOST || host === `www.${MAIN_HOST}`;

    if (isAdminHost && pathname === "/") {
        return NextResponse.redirect(new URL("/kalendar", request.url));
    }

    if (!BOOKING_ENABLED && matchesPath(pathname, ["/rezervace"])) {
        return NextResponse.redirect(new URL("/", request.url));
    }

    if (isMainHost && matchesPath(pathname, ADMIN_PATHS)) {
        return NextResponse.redirect(
            new URL(`https://${ADMIN_HOST}${pathname}`, request.url)
        );
    }

    if (matchesPath(pathname, PROTECTED_PATHS)) {
        return checkSession(request, event);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!_next|.*\\..*).*)"],
};
