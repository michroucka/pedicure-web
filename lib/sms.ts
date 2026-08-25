import { toE164 } from "./utils.ts";

const API_URL = "https://api.smsmngr.com/v2/message";

// Fire-and-forget-ish: logs and returns false on any failure rather than
// throwing, so a caller sending SMS to many recipients (the morning
// reminder cron) can skip one failed send without losing the rest.
export async function sendSms(phone: string, body: string): Promise<boolean> {
    const apiKey = process.env.SMSMANAGER_API_KEY;
    if (!apiKey) {
        console.error("SMSMANAGER_API_KEY není nastaven, SMS nebyla odeslána.");
        return false;
    }

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "x-api-key": apiKey,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                body,
                to: [{ phone_number: toE164(phone) }],
            }),
        });

        if (!response.ok) {
            console.error(
                "Odeslání SMS selhalo:",
                response.status,
                await response.text()
            );
            return false;
        }

        return true;
    } catch (error) {
        console.error("Odeslání SMS selhalo:", error);
        return false;
    }
}
