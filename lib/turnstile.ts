import "server-only";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
// A hanging Cloudflare would otherwise hold the booking until the function
// itself times out – treated the same as Cloudflare being down.
const VERIFY_TIMEOUT_MS = 5000;

type SiteverifyResponse = { success: boolean; "error-codes"?: string[] };

// Cloudflare Turnstile check for the public booking form (bots filling the
// calendar, sending e-mails/SMS to random people). Off until
// NEXT_PUBLIC_TURNSTILE_SITE_KEY is set (local dev, tests); a site key
// without TURNSTILE_SECRET_KEY is a misconfiguration and rejects.
export async function verifyTurnstileToken(
    token: string | null | undefined
): Promise<boolean> {
    if (!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) return true;

    const secret = process.env.TURNSTILE_SECRET_KEY;
    if (!secret) {
        console.error(
            "TURNSTILE_SECRET_KEY není nastaven, rezervace odmítnuta."
        );
        return false;
    }
    if (!token) return false;

    try {
        const response = await fetch(VERIFY_URL, {
            method: "POST",
            body: new URLSearchParams({ secret, response: token }),
            signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
        });
        // Cloudflare itself being down must not take online booking down
        // with it – an attacker can't cause this, only a real outage can.
        if (!response.ok) {
            console.error("Turnstile siteverify selhal:", response.status);
            return true;
        }
        const result: SiteverifyResponse = await response.json();
        if (!result.success) {
            console.warn("Turnstile ověření neprošlo:", result["error-codes"]);
        }
        return result.success;
    } catch (error) {
        console.error("Turnstile siteverify nedostupný:", error);
        return true;
    }
}
