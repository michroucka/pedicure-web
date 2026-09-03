import { Resend } from "resend";

const FROM_EMAIL = "Pedikúra Kralovice <rezervace@pedikurakralovice.cz>";

// Internal ops alert, not client-facing — plain text is enough, no
// react-email template needed.
export async function sendLowCreditAlertEmail(
    creditCzk: number
): Promise<void> {
    const apiKey = process.env.RESEND_API_KEY;
    const to = process.env.ALERT_EMAIL_TO;
    if (!apiKey || !to) {
        console.error(
            "RESEND_API_KEY nebo ALERT_EMAIL_TO není nastaven, upozornění na nízký kredit nebylo odesláno."
        );
        return;
    }

    try {
        const resend = new Resend(apiKey);
        await resend.emails.send({
            from: FROM_EMAIL,
            to,
            subject: "Nízký kredit SMS brány",
            text: `Zůstatek na SMSManager.cz klesl na ${creditCzk.toFixed(2)} Kč. Doplňte prosím kredit, aby se dál mohly odesílat připomínkové SMS klientům.`,
        });
    } catch (error) {
        console.error(
            "Nepodařilo se odeslat upozornění na nízký kredit:",
            error
        );
    }
}
