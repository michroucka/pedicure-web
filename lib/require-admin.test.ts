import { afterEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/auth";
import { requireAdmin } from "./require-admin";

vi.mock("server-only", () => ({}));
vi.mock("@/auth", () => ({ auth: vi.fn() }));

class RedirectError extends Error {
    constructor(public url: string) {
        super(`redirect: ${url}`);
    }
}
vi.mock("next/navigation", () => ({
    redirect: vi.fn((url: string) => {
        throw new RedirectError(url);
    }),
}));

// auth() is overloaded (also a middleware wrapper) – the mock only ever
// stands in for the plain "get the session" call.
const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;

describe("requireAdmin", () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it("returns the username of a logged-in admin", async () => {
        mockedAuth.mockResolvedValue({ user: { name: "pedikerka" } });

        expect(await requireAdmin()).toBe("pedikerka");
    });

    it("redirects to login without a session", async () => {
        mockedAuth.mockResolvedValue(null);

        await expect(requireAdmin()).rejects.toThrow("redirect: /login");
    });

    it("redirects to login when the session has no username", async () => {
        mockedAuth.mockResolvedValue({ user: {} });

        await expect(requireAdmin()).rejects.toThrow("redirect: /login");
    });
});
