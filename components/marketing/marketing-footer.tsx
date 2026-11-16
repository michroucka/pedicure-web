import Image from "next/image";
import Link from "next/link";
import { BUSINESS_INFO, OPERATOR_INFO } from "@/lib/business-info";
import { MonochromeLogo } from "@/components/marketing/monochrome-logo";
import { CzechText } from "@/components/czech-text";

const SITE_LAUNCH_YEAR = 2026;

// py-3 -my-3: >= 44 px touch target without changing the line spacing.
const LINK_CLASSES = "-my-3 py-3 transition-colors hover:text-foreground";
const COLUMN_HEADING_CLASSES =
    "font-sans text-sm font-medium tracking-wide text-foreground/70 uppercase";

const PROFILES = [
    {
        href: BUSINESS_INFO.profiles.google,
        label: "Google",
        logo: "/google-logo.svg",
    },
    {
        href: BUSINESS_INFO.profiles.firmy,
        label: "Firmy.cz",
        logo: "/firmy-logo.svg",
    },
];

export function MarketingFooter() {
    const { address } = BUSINESS_INFO;

    return (
        <CzechText>
            <footer className="border-t border-border/60 bg-card">
                <div className="mx-auto max-w-5xl px-4 pt-12 pb-8 sm:px-6 md:pt-16">
                    {/* Phone: everything stacked. sm: brand on top, the two
                        columns side by side. lg: the wrapper dissolves so brand
                        and both columns share one grid row. */}
                    <div className="grid gap-10 lg:grid-cols-[2fr_1fr_1fr] lg:gap-16">
                        <div>
                            <Link
                                href="/"
                                className="inline-block"
                            >
                                <Image
                                    src="/logo-banner-light.svg"
                                    alt={BUSINESS_INFO.name}
                                    width={221}
                                    height={60}
                                    className="h-14 w-auto"
                                    draggable={false}
                                />
                            </Link>
                            <p className="mt-4 max-w-xs text-sm text-balance text-muted-foreground">
                                Kvalitní a profesionální péče o vaše nohy – už
                                20 let.
                            </p>
                        </div>

                        <div className="flex flex-col gap-10 sm:flex-row sm:gap-16 lg:contents">
                            <section aria-labelledby="footer-contact">
                                <h2
                                    id="footer-contact"
                                    className={COLUMN_HEADING_CLASSES}
                                >
                                    Kontakt
                                </h2>
                                <ul className="mt-4 flex flex-col items-start gap-2 text-sm text-muted-foreground">
                                    <li>
                                        <a
                                            href={`tel:${BUSINESS_INFO.phone}`}
                                            className={`${LINK_CLASSES} whitespace-nowrap`}
                                        >
                                            {BUSINESS_INFO.phoneDisplay}
                                        </a>
                                    </li>
                                    <li>
                                        <a
                                            href={`mailto:${BUSINESS_INFO.email}`}
                                            className={LINK_CLASSES}
                                        >
                                            {BUSINESS_INFO.email}
                                        </a>
                                    </li>
                                    <li>
                                        <a
                                            href={BUSINESS_INFO.mapsUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={LINK_CLASSES}
                                        >
                                            {address.street}
                                            <br />
                                            {address.postalCode} {address.city}
                                        </a>
                                    </li>
                                </ul>
                            </section>

                            <section aria-labelledby="footer-profiles">
                                <h2
                                    id="footer-profiles"
                                    className={COLUMN_HEADING_CLASSES}
                                >
                                    Najdete mě
                                </h2>
                                <ul className="mt-4 flex flex-col items-start gap-2 text-sm text-muted-foreground">
                                    {PROFILES.map((profile) => (
                                        <li key={profile.href}>
                                            <a
                                                href={profile.href}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={`${LINK_CLASSES} inline-flex items-center gap-2`}
                                            >
                                                <MonochromeLogo
                                                    src={profile.logo}
                                                    className="size-4"
                                                />
                                                {profile.label}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        </div>
                    </div>

                    <div className="mt-12 flex flex-col gap-3 border-t border-border/60 pt-6 text-xs text-muted-foreground">
                        <div className="flex flex-wrap items-start gap-x-8 gap-y-3">
                            <p>
                                © {SITE_LAUNCH_YEAR} {BUSINESS_INFO.name}
                            </p>
                            <Link
                                href="/ochrana-osobnich-udaju"
                                className={LINK_CLASSES}
                            >
                                Ochrana osobních údajů
                            </Link>
                        </div>
                        <div className="flex flex-col items-start gap-3 md:flex-row md:justify-between">
                            <p>
                                Provozovatel: {OPERATOR_INFO.name}, IČO{" "}
                                {OPERATOR_INFO.ico}
                            </p>
                            <a
                                href="https://www.michalroucka.cz"
                                target="_blank"
                                rel="noopener noreferrer"
                                className={LINK_CLASSES}
                            >
                                Tvorba webu: Michal Roučka
                            </a>
                        </div>
                    </div>
                </div>
            </footer>
        </CzechText>
    );
}
