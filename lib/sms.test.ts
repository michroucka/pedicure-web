import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getSmsCreditCzk, sendSms } from "./sms";

describe("SMSManager client", () => {
    let fetchMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        // Every test replaces fetch, so nothing can reach the real API.
        fetchMock = vi.fn().mockRejectedValue(new Error("unexpected fetch"));
        vi.stubGlobal("fetch", fetchMock);
        vi.spyOn(console, "error").mockImplementation(() => {});
        vi.stubEnv("SMSMANAGER_API_KEY", "test-key");
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    describe("sendSms", () => {
        it("posts the message with the E.164 number and API key", async () => {
            fetchMock.mockResolvedValue(
                Response.json({
                    request_id: "r1",
                    accepted: [{ key: "k", message_id: "m1" }],
                    rejected: [],
                })
            );

            expect(await sendSms("123 456 789", "Ahoj")).toBe(true);

            expect(fetchMock).toHaveBeenCalledOnce();
            const [url, init] = fetchMock.mock.calls[0];
            expect(url).toBe("https://api.smsmngr.com/v2/message");
            expect(init.method).toBe("POST");
            expect(init.headers).toMatchObject({
                "x-api-key": "test-key",
                "Content-Type": "application/json",
            });
            expect(JSON.parse(init.body)).toEqual({
                body: "Ahoj",
                to: [{ phone_number: "420123456789" }],
            });
        });

        it("returns false when HTTP 200 still lists the recipient as rejected", async () => {
            fetchMock.mockResolvedValue(
                Response.json({
                    request_id: "r1",
                    accepted: [],
                    rejected: [{ key: "k" }],
                })
            );
            expect(await sendSms("123456789", "Ahoj")).toBe(false);
        });

        it("returns false on an HTTP error", async () => {
            fetchMock.mockResolvedValue(
                new Response("unauthorized", { status: 401 })
            );
            expect(await sendSms("123456789", "Ahoj")).toBe(false);
        });

        it("returns false instead of throwing on a network error", async () => {
            fetchMock.mockRejectedValue(new TypeError("fetch failed"));
            expect(await sendSms("123456789", "Ahoj")).toBe(false);
        });

        it("returns false without calling the API when the key is missing", async () => {
            vi.stubEnv("SMSMANAGER_API_KEY", "");
            expect(await sendSms("123456789", "Ahoj")).toBe(false);
            expect(fetchMock).not.toHaveBeenCalled();
        });
    });

    describe("getSmsCreditCzk", () => {
        it("returns the credit as a number", async () => {
            fetchMock.mockResolvedValue(
                Response.json({
                    success: true,
                    credit: { credit_czk: "123.45" },
                })
            );

            expect(await getSmsCreditCzk()).toBe(123.45);
            expect(fetchMock).toHaveBeenCalledWith(
                "https://rest-api.smsmngr.com/v1/credit",
                { headers: { "x-api-key": "test-key" } }
            );
        });

        it("returns null on an HTTP error", async () => {
            fetchMock.mockResolvedValue(new Response("oops", { status: 500 }));
            expect(await getSmsCreditCzk()).toBeNull();
        });

        it("returns null on a network error", async () => {
            fetchMock.mockRejectedValue(new TypeError("fetch failed"));
            expect(await getSmsCreditCzk()).toBeNull();
        });

        it("returns null on an unexpected response shape", async () => {
            fetchMock.mockResolvedValue(Response.json({ success: false }));
            expect(await getSmsCreditCzk()).toBeNull();
        });

        it("returns null without calling the API when the key is missing", async () => {
            vi.stubEnv("SMSMANAGER_API_KEY", "");
            expect(await getSmsCreditCzk()).toBeNull();
            expect(fetchMock).not.toHaveBeenCalled();
        });
    });
});
