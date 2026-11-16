import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Mail, MapPin, Phone } from "lucide-react";
import { BOOKING_ENABLED } from "@/lib/booking-enabled";
import { BUSINESS_INFO } from "@/lib/business-info";
import { MonochromeLogo } from "@/components/marketing/monochrome-logo";
import { MapEmbed } from "@/components/marketing/map-embed";
import { CzechText } from "@/components/czech-text";

export const metadata: Metadata = {
    title: "Kontakt",
    description: `Kontakt na pedikúru ${BUSINESS_INFO.name} – ${BUSINESS_INFO.address.street}, ${BUSINESS_INFO.address.city}. Telefon, e-mail a mapa provozovny.`,
    alternates: { canonical: "/kontakt" },
};

const REVIEW_LINKS = [
    {
        href: "https://g.page/r/CdZJqS_7_oGNEBM/review",
        label: "Google",
        logo: "/google-logo.svg",
    },
    {
        href: `${BUSINESS_INFO.profiles.firmy}#pridat-hodnoceni`,
        label: "Firmy.cz",
        logo: "/firmy-logo.svg",
    },
];

export default function KontaktPage() {
    return (
        <CzechText>
            <section>
                <div className="mx-auto max-w-5xl px-4 pt-12 pb-12 sm:px-6 md:pt-16">
                    <h1>Kontakt</h1>
                    <p className="mt-4 max-w-prose text-base leading-relaxed text-pretty text-muted-foreground">
                        Dopřejte svým nohám péči zkušených rukou. Ať už
                        potřebujete pravidelnou pedikúru, řešíte konkrétní
                        problém, nebo si chcete jednoduše dopřát chvíli pro
                        sebe, budu se na vás těšit.
                    </p>

                    <div className="mt-10 grid gap-10 md:grid-cols-2 md:gap-12">
                        <div>
                            <dl className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-4 text-sm">
                                <dt className="flex items-center gap-1 text-muted-foreground">
                                    <Phone className="size-4" />
                                    Telefon:
                                </dt>
                                <dd>
                                    <a
                                        href={`tel:${BUSINESS_INFO.phone}`}
                                        className="transition-colors hover:text-primary"
                                    >
                                        {BUSINESS_INFO.phoneDisplay}
                                    </a>
                                </dd>

                                <dt className="flex items-center gap-1 text-muted-foreground">
                                    <Mail className="size-4" />
                                    E-mail:
                                </dt>
                                <dd>
                                    <a
                                        href={`mailto:${BUSINESS_INFO.email}`}
                                        className="transition-colors hover:text-primary"
                                    >
                                        {BUSINESS_INFO.email}
                                    </a>
                                </dd>

                                <dt className="flex items-center gap-1 text-muted-foreground">
                                    <MapPin className="size-4" />
                                    Adresa:
                                </dt>
                                <dd>
                                    <a
                                        href={BUSINESS_INFO.mapsUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="transition-colors hover:text-primary"
                                    >
                                        {BUSINESS_INFO.address.street},{" "}
                                        {BUSINESS_INFO.address.city}
                                    </a>
                                </dd>
                            </dl>

                            {BOOKING_ENABLED && (
                                <Button
                                    asChild
                                    size="lg"
                                    className="mt-8 w-full sm:w-auto"
                                >
                                    <Link href="/rezervace">Objednat se</Link>
                                </Button>
                            )}

                            <section
                                aria-labelledby="kontakt-rating"
                                className="mt-10"
                            >
                                <h2
                                    id="kontakt-rating"
                                    className="font-sans text-sm font-medium tracking-wide text-foreground/70 uppercase"
                                >
                                    Ohodnoťte nás
                                </h2>
                                <div className="mt-4 flex flex-wrap gap-3">
                                    {REVIEW_LINKS.map((review) => (
                                        <a
                                            key={review.href}
                                            href={review.href}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex h-11 items-center gap-2 rounded-full border border-border px-4 text-sm transition-colors hover:border-primary/60 hover:text-primary"
                                        >
                                            <MonochromeLogo
                                                src={review.logo}
                                                className="size-4"
                                            />
                                            {review.label}
                                        </a>
                                    ))}
                                </div>
                            </section>
                        </div>

                        <MapEmbed className="md:h-auto md:min-h-80" />
                    </div>
                </div>
            </section>
        </CzechText>
    );
}
