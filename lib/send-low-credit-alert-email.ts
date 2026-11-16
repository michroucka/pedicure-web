import { getResendClient } from "@/lib/resend-client";
import { EMAIL_FROM } from "@/lib/business-info";

// Internal ops alert, not client-facing – plain text is enough, no
// react-email template needed.
export async function sendLowCreditAlertEmail(
    creditCzk: number
): Promise<void> {
    const resend = getResendClient();
    const to = process.env.ALERT_EMAIL_TO;
    if (!resend || !to) {
        console.error(
            "RESEND_API_KEY or ALERT_EMAIL_TO is not set, low credit alert not sent."
        );
        return;
    }

    try {
        await resend.emails.send({
            from: EMAIL_FROM,
            to,
            subject: "Nízký kredit SMS brány",
            text: `Zůstatek na SMSManager.cz klesl na ${creditCzk.toFixed(2)} Kč. Doplňte prosím kredit, aby se dál mohly odesílat připomínkové SMS klientům.`,
        });
    } catch (error) {
        console.error("Failed to send low credit alert email:", error);
    }
}
