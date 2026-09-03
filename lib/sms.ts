import { toE164 } from "./utils.ts";

const API_URL = "https://api.smsmngr.com/v2/message";
const CREDIT_URL = "https://rest-api.smsmngr.com/v1/credit";

type MessageResponse = {
    request_id: string;
    accepted: { key: string; message_id: string }[];
    rejected: { key: string }[];
};

type CreditResponse = {
    success: boolean;
    credit: { credit_czk: string };
};

// Separate REST API (v1), not the JSON API (v2) used for sending — same
// x-api-key auth, different host. Returns null on any failure so a caller
// (the morning cron) can just skip the low-credit check for that run
// instead of blowing up the whole reminder send.
export async function getSmsCreditCzk(): Promise<number | null> {
    const apiKey = process.env.SMSMANAGER_API_KEY;
    if (!apiKey) return null;

    try {
        const response = await fetch(CREDIT_URL, {
            headers: { "x-api-key": apiKey },
        });
        if (!response.ok) {
            console.error(
                "Nepodařilo se zjistit kredit SMS brány:",
                response.status,
                await response.text()
            );
            return null;
        }

        const result: CreditResponse = await response.json();
        return Number(result.credit.credit_czk);
    } catch (error) {
        console.error("Nepodařilo se zjistit kredit SMS brány:", error);
        return null;
    }
}

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

        // SMSManager can respond with HTTP 200 even when the recipient was
        // rejected (e.g. insufficient credit, invalid number) — a non-empty
        // `rejected` array means the message was never actually sent, even
        // though the request itself was accepted.
        const result: MessageResponse = await response.json();
        if (result.rejected.length > 0) {
            console.error("SMS byla odmítnuta:", result);
            return false;
        }

        return true;
    } catch (error) {
        console.error("Odeslání SMS selhalo:", error);
        return false;
    }
}
