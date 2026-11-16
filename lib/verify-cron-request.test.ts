import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyCronRequest } from "./verify-cron-request";

function cronRequest(authorization?: string) {
    return new NextRequest("https://www.pedikurakralovice.cz/api/cron/x", {
        headers: authorization ? { authorization } : {},
    });
}

describe("verifyCronRequest", () => {
    afterEach(() => {
        vi.unstubAllEnvs();
        vi.restoreAllMocks();
    });

    it("lets the request through with the correct bearer secret", () => {
        vi.stubEnv("CRON_SECRET", "s3cret");
        expect(verifyCronRequest(cronRequest("Bearer s3cret"))).toBeNull();
    });

    it("rejects a wrong secret with 401", async () => {
        vi.stubEnv("CRON_SECRET", "s3cret");
        const response = verifyCronRequest(cronRequest("Bearer nope"));
        expect(response?.status).toBe(401);
        expect(await response?.json()).toEqual({ error: "Unauthorized" });
    });

    it("rejects the bare secret without the Bearer prefix", () => {
        vi.stubEnv("CRON_SECRET", "s3cret");
        expect(verifyCronRequest(cronRequest("s3cret"))?.status).toBe(401);
    });

    it("rejects a missing Authorization header with 401", () => {
        vi.stubEnv("CRON_SECRET", "s3cret");
        expect(verifyCronRequest(cronRequest())?.status).toBe(401);
    });

    it("fails closed with 500 when CRON_SECRET is not set", async () => {
        vi.stubEnv("CRON_SECRET", "");
        vi.spyOn(console, "error").mockImplementation(() => {});

        // "Bearer " would match `Bearer ${""}` if the env check were missing.
        const response = verifyCronRequest(cronRequest("Bearer "));
        expect(response?.status).toBe(500);
        expect(await response?.json()).toEqual({
            error: "Server misconfigured",
        });
    });
});
