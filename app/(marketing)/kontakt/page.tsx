import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarClock, Mail, MapPin, Phone } from "lucide-react";
import { BOOKING_ENABLED } from "@/lib/booking-enabled";
import { BUSINESS_INFO } from "@/lib/business-info";
import { MonochromeLogo } from "@/components/marketing/monochrome-logo";
import { MapEmbed } from "@/components/marketing/map-embed";
import { CzechText } from "@/components/czech-text";
import { stagger } from "@/lib/stagger";

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

const CONTACT_ACTIONS = [
    {
        href: `tel:${BUSINESS_INFO.phone}`,
        label: "Zavolat",
        value: BUSINESS_INFO.phoneDisplay,
        icon: Phone,
        external: false,
    },
    {
        href: `mailto:${BUSINESS_INFO.email}`,
        label: "Napsat e-mail",
        // Too long for a phone line: break after the "@", not mid-word.
        value: (
            <>
                {BUSINESS_INFO.email.split("@")[0]}@
                <wbr />
                {BUSINESS_INFO.email.split("@")[1]}
            </>
        ),
        icon: Mail,
        external: false,
    },
    {
        href: BUSINESS_INFO.mapsUrl,
        label: "Navigovat",
        value: `${BUSINESS_INFO.address.street}, ${BUSINESS_INFO.address.city}`,
        icon: MapPin,
        external: true,
    },
    // No hours on purpose: published hours are binding (an inspection can
    // come any time within them), and she works by appointment only.
    ...(BOOKING_ENABLED
        ? [
              {
                  href: "/rezervace",
                  label: "Provozní doba",
                  value: "Dle objednávek",
                  icon: CalendarClock,
                  external: false,
                  cta: "Objednat se",
              },
          ]
        : []),
];

export default function KontaktPage() {
    return (
        <CzechText>
            <section>
                <div className="mx-auto max-w-5xl px-4 pt-12 pb-12 sm:px-6 md:pt-16">
                    <h1
                        className="enter"
                        style={stagger(0)}
                    >
                        Kontakt
                    </h1>
                    <p
                        className="enter mt-4 max-w-prose text-base leading-relaxed text-pretty text-muted-foreground"
                        style={stagger(1)}
                    >
                        Dopřejte svým nohám péči zkušených rukou. Ať už
                        potřebujete pravidelnou pedikúru, řešíte konkrétní
                        problém, nebo si chcete jednoduše dopřát chvíli pro
                        sebe, budu se na vás těšit.
                    </p>

                    <div className="mt-10 grid gap-10 md:grid-cols-2 md:gap-12">
                        <div
                            className="enter min-w-0"
                            style={stagger(2)}
                        >
                            <ul className="flex flex-col gap-3">
                                {CONTACT_ACTIONS.map((action) => {
                                    // tel:/mailto:/external stay plain links,
                                    // the booking page goes through Next.
                                    const Anchor = action.href.startsWith("/")
                                        ? Link
                                        : "a";
                                    return (
                                        <li key={action.href}>
                                            <Anchor
                                                href={action.href}
                                                {...(action.external && {
                                                    target: "_blank",
                                                    rel: "noopener noreferrer",
                                                })}
                                                className="group flex min-h-16 flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl border border-border px-4 py-3 transition-colors hover:border-primary/60"
                                            >
                                                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                                                    <action.icon className="size-5" />
                                                </span>
                                                <span className="min-w-0 flex-1">
                                                    <span className="block text-sm text-muted-foreground">
                                                        {action.label}
                                                    </span>
                                                    <span className="block text-base font-medium wrap-anywhere transition-colors group-hover:text-primary">
                                                        {action.value}
                                                    </span>
                                                </span>
                                                {"cta" in action && (
                                                    // On a narrow phone it goes under the text (lined
                                                    // up past the icon: size-11 + gap-x-4).
                                                    <span className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors group-hover:text-foreground max-[25rem]:basis-full max-[25rem]:pl-15">
                                                        {action.cta}
                                                        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                                                    </span>
                                                )}
                                            </Anchor>
                                        </li>
                                    );
                                })}
                            </ul>

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

                        <MapEmbed
                            className="enter md:h-auto md:min-h-80"
                            style={stagger(3)}
                        />
                    </div>
                </div>
            </section>
        </CzechText>
    );
}
