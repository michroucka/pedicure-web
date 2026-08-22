import { NextRequest, NextResponse } from "next/server";

// Domain-based routing: the admin routes (kalendar/dostupnost/klienti/login)
// have no shared URL prefix, so they only make sense reachable through
// admin.pedikurakralovice.cz. This has to happen before Next.js resolves a
// route at all, based on the Host header — a layout can't do that (it runs
// after routing), so it's one of the few legitimate uses of a proxy left in
// this app (see app/(admin)/(dashboard)/layout.tsx for the actual auth
// check, which *is* handled at the layout level).
const MAIN_HOST = "pedikurakralovice.cz";
const ADMIN_HOST = "admin.pedikurakralovice.cz";

const ADMIN_PATHS = ["/kalendar", "/dostupnost", "/klienti", "/login"];

function isAdminPath(pathname: string) {
    return ADMIN_PATHS.some(
        (path) => pathname === path || pathname.startsWith(`${path}/`)
    );
}

export default function proxy(request: NextRequest) {
    const host = request.headers.get("host") ?? "";
    const { pathname } = request.nextUrl;

    const isAdminHost = host === ADMIN_HOST || host === `www.${ADMIN_HOST}`;
    const isMainHost = host === MAIN_HOST || host === `www.${MAIN_HOST}`;

    if (isAdminHost && pathname === "/") {
        return NextResponse.redirect(new URL("/kalendar", request.url));
    }

    if (isMainHost && isAdminPath(pathname)) {
        return NextResponse.redirect(
            new URL(`https://${ADMIN_HOST}${pathname}`, request.url)
        );
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!_next|.*\\..*).*)"],
};
