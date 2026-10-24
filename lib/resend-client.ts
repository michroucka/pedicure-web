import { Resend } from "resend";

let resend: Resend | undefined;

// One client per server instance instead of one per e-mail. Null when
// RESEND_API_KEY isn't set (local dev) - callers log and skip sending.
export function getResendClient(): Resend | null {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return null;
    resend ??= new Resend(apiKey);
    return resend;
}
