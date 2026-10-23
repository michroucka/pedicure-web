import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { verifyTurnstileToken } = await import("./turnstile.ts");

describe("verifyTurnstileToken", () => {
    afterEach(() => {
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
    });

    function stubSiteverify(response: Response) {
        const fetchMock = vi.fn().mockResolvedValue(response);
        vi.stubGlobal("fetch", fetchMock);
        return fetchMock;
    }

    it("is off without a site key", async () => {
        vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "");
        expect(await verifyTurnstileToken(null)).toBe(true);
    });

    it("rejects when the site key is set but the secret is missing", async () => {
        vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "site");
        vi.stubEnv("TURNSTILE_SECRET_KEY", "");
        expect(await verifyTurnstileToken("token")).toBe(false);
    });

    it("rejects a missing token without calling Cloudflare", async () => {
        vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "site");
        vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
        const fetchMock = stubSiteverify(Response.json({ success: true }));

        expect(await verifyTurnstileToken(null)).toBe(false);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("returns what siteverify says", async () => {
        vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "site");
        vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");

        stubSiteverify(Response.json({ success: true }));
        expect(await verifyTurnstileToken("good")).toBe(true);

        stubSiteverify(
            Response.json({
                success: false,
                "error-codes": ["invalid-input-response"],
            })
        );
        expect(await verifyTurnstileToken("bad")).toBe(false);
    });

    it("gives up on a hanging Cloudflare and lets the booking through", async () => {
        vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "site");
        vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
        const fetchMock = vi.fn(
            (_url: string, init: RequestInit) =>
                new Promise((_resolve, reject) => {
                    init.signal?.addEventListener("abort", () => reject(init.signal?.reason));
                })
        );
        vi.stubGlobal("fetch", fetchMock);

        expect(await verifyTurnstileToken("token")).toBe(true);
        expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
    }, 10_000);

    it("lets the booking through when Cloudflare itself is unavailable", async () => {
        vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "site");
        vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");

        stubSiteverify(new Response("", { status: 503 }));
        expect(await verifyTurnstileToken("token")).toBe(true);
    });
});
