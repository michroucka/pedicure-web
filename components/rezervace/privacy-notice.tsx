import Link from "next/link";

// Informative only, no consent checkbox: the legal basis for processing
// booking data is performance of a contract (Art. 6(1)(b) GDPR), not consent.
export function PrivacyNotice() {
    return (
        <p className="mt-6 text-xs leading-relaxed text-pretty text-muted-foreground">
            Odesláním rezervace berete na vědomí zpracování osobních údajů
            podle{" "}
            <Link
                href="/ochrana-osobnich-udaju"
                target="_blank"
                className="underline underline-offset-2 transition-colors hover:text-foreground"
            >
                zásad ochrany osobních údajů
            </Link>
            .
        </p>
    );
}
