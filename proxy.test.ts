import type { NextFetchEvent } from "next/server";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Stands in for Auth.js's auth(handler) wrapper: attaches the session the
// test chose as req.auth and calls the handler, like the real wrapper does
// (minus the cookie handling).
const authState = vi.hoisted(() => ({
    session: null as { user: { name: string } } | null,
}));

vi.mock("@/auth", () => ({
    auth:
        (handler: (req: unknown, event: unknown) => unknown) =>
        (req: NextRequest, event: unknown) =>
            handler(Object.assign(req, { auth: authState.session }), event),
}));

const bookingFlag = vi.hoisted(() => ({ enabled: true }));

vi.mock("@/lib/booking-enabled", () => ({
    get BOOKING_ENABLED() {
        return bookingFlag.enabled;
    },
}));

const { default: proxy } = await import("./proxy");

const event = {} as NextFetchEvent;

async function visit(url: string) {
    const { host } = new URL(url);
    const response = await proxy(
        new NextRequest(url, { headers: { host } }),
        event
    );
    if (!(response instanceof Response)) {
        throw new Error("proxy returned no response");
    }
    return response;
}

function expectRedirect(response: Response, location: string) {
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(location);
}

function expectPassThrough(response: Response) {
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.get("location")).toBeNull();
}

describe("proxy", () => {
    beforeEach(() => {
        authState.session = null;
        bookingFlag.enabled = true;
    });

    afterEach(() => {
        authState.session = null;
        bookingFlag.enabled = true;
    });

    describe("main domain", () => {
        it.each([
            "/kalendar",
            "/dostupnost",
            "/klienti",
            "/login",
            "/nastaveni",
            "/klienti/abc",
        ])("sends admin path %s to the admin subdomain", async (path) => {
            expectRedirect(
                await visit(`https://www.pedikurakralovice.cz${path}`),
                `https://admin.pedikurakralovice.cz${path}`
            );
        });

        it("also redirects from the apex host", async () => {
            expectRedirect(
                await visit("https://pedikurakralovice.cz/kalendar"),
                "https://admin.pedikurakralovice.cz/kalendar"
            );
        });

        it("keeps the query string when redirecting to the admin subdomain", async () => {
            expectRedirect(
                await visit(
                    "https://www.pedikurakralovice.cz/kalendar?date=2026-11-16"
                ),
                "https://admin.pedikurakralovice.cz/kalendar?date=2026-11-16"
            );
        });

        it("does not treat a path that only shares a prefix as admin", async () => {
            expectPassThrough(
                await visit("https://www.pedikurakralovice.cz/kalendarik")
            );
        });

        it.each(["/", "/cenik", "/kontakt", "/rezervace"])(
            "passes %s through",
            async (path) => {
                expectPassThrough(
                    await visit(`https://www.pedikurakralovice.cz${path}`)
                );
            }
        );
    });

    describe("admin subdomain", () => {
        it("redirects / to /kalendar", async () => {
            expectRedirect(
                await visit("https://admin.pedikurakralovice.cz/"),
                "https://admin.pedikurakralovice.cz/kalendar"
            );
        });

        it("redirects / to /kalendar on the www. admin host too", async () => {
            expectRedirect(
                await visit("https://www.admin.pedikurakralovice.cz/"),
                "https://www.admin.pedikurakralovice.cz/kalendar"
            );
        });

        it.each(["/kalendar", "/dostupnost", "/klienti", "/nastaveni"])(
            "sends an unauthenticated visitor on %s to /login",
            async (path) => {
                expectRedirect(
                    await visit(`https://admin.pedikurakralovice.cz${path}`),
                    "https://admin.pedikurakralovice.cz/login"
                );
            }
        );

        it("protects nested admin paths", async () => {
            expectRedirect(
                await visit("https://admin.pedikurakralovice.cz/klienti/abc"),
                "https://admin.pedikurakralovice.cz/login"
            );
        });

        it("lets a signed-in admin through", async () => {
            authState.session = { user: { name: "admin" } };
            expectPassThrough(
                await visit("https://admin.pedikurakralovice.cz/kalendar")
            );
        });

        it("treats a session without a user as signed out", async () => {
            authState.session = {} as { user: { name: string } };
            expectRedirect(
                await visit("https://admin.pedikurakralovice.cz/kalendar"),
                "https://admin.pedikurakralovice.cz/login"
            );
        });

        it("leaves /login open without a session", async () => {
            expectPassThrough(
                await visit("https://admin.pedikurakralovice.cz/login")
            );
        });
    });

    describe("other hosts (localhost, Vercel previews)", () => {
        it("does not redirect between hosts but still requires a session", async () => {
            expectRedirect(
                await visit("http://localhost:3000/kalendar"),
                "http://localhost:3000/login"
            );
            expectPassThrough(await visit("http://localhost:3000/login"));
            expectPassThrough(await visit("http://localhost:3000/"));
        });
    });

    describe("booking kill switch", () => {
        it("redirects /rezervace and its subpaths home when booking is off", async () => {
            bookingFlag.enabled = false;
            expectRedirect(
                await visit("https://www.pedikurakralovice.cz/rezervace"),
                "https://www.pedikurakralovice.cz/"
            );
            expectRedirect(
                await visit(
                    "https://www.pedikurakralovice.cz/rezervace/sprava/token"
                ),
                "https://www.pedikurakralovice.cz/"
            );
        });

        it("leaves the rest of the site alone when booking is off", async () => {
            bookingFlag.enabled = false;
            expectPassThrough(
                await visit("https://www.pedikurakralovice.cz/cenik")
            );
        });
    });
});
