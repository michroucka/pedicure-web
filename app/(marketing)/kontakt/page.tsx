import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button.tsx";
import { Mail, MapPin, Phone, Star } from "lucide-react";
import { BOOKING_ENABLED } from "@/lib/booking-enabled.ts";
import Image from "next/image";
import { BUSINESS_INFO, OPERATOR_INFO } from "@/lib/business-info.ts"
import { MapEmbed } from "@/components/marketing/map-embed.tsx";

export const metadata: Metadata = {
    title: "Kontakt",
    description:
        "Kontakt na pedikúru Nohy v cajku – Boženy Němcové 204, Kralovice. Telefon, e-mail a mapa provozovny.",
    alternates: { canonical: "/kontakt" },
};

export default function KontaktPage() {
    return (
        <section>
            <div className="mx-auto max-w-2xl px-4 pt-8 pb-12 sm:px-6">
                <h1 className="italic">Kontakt</h1>
                <p className="mt-4 max-w-prose text-base leading-relaxed text-pretty text-muted-foreground">
                    Dopřejte svým nohám péči zkušených rukou. Ať už potřebujete
                    pravidelnou pedikúru, řešíte konkrétní problém, nebo si
                    chcete jednoduše dopřát chvíli pro sebe, budu se na vás
                    těšit.
                </p>

                <dl className="mt-8 grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-3 text-sm">
                    <dt className="flex items-center gap-1 text-muted-foreground">
                        <Phone className="size-4" />
                        Telefon:
                    </dt>
                    <dd className="text-muted-foreground italic">
                        <a href={`tel:${BUSINESS_INFO.phone}`}>
                            {BUSINESS_INFO.phoneDisplay}
                        </a>
                    </dd>

                    <dt className="flex items-center gap-1 text-muted-foreground">
                        <Mail className="size-4" />
                        E-Mail:
                    </dt>
                    <dd className="text-muted-foreground italic">
                        <a href={`mailto:${BUSINESS_INFO.email}`}>
                            {BUSINESS_INFO.email}
                        </a>
                    </dd>

                    <dt className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="size-4" />
                        Adresa:
                    </dt>
                    <dd className="text-muted-foreground italic">
                        {BUSINESS_INFO.address.street},{" "}
                        {BUSINESS_INFO.address.city}
                    </dd>
                </dl>

                {BOOKING_ENABLED && (
                    <div className="mt-8 flex justify-start">
                        <Button
                            asChild
                            size="lg"
                        >
                            <Link href="/rezervace">Objednat se</Link>
                        </Button>
                    </div>
                )}

                <MapEmbed />

                <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-border bg-card px-5 py-4">
                    <div className="flex items-center gap-2">
                        <Star className="size-4 shrink-0 text-primary" />
                        <h5>Ohodnoťte nás</h5>
                    </div>
                    <div className="flex gap-2">
                        <a
                            href="https://g.page/r/CdZJqS_7_oGNEBM/review"
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Ohodnotit na Googlu"
                            className="flex size-11 items-center justify-center rounded-full bg-muted transition-colors hover:bg-primary/10"
                        >
                            <Image
                                src="/google-logo.svg"
                                alt="Google"
                                width={32}
                                height={32}
                                className="size-6.5"
                            />
                        </a>
                        <a
                            href="https://www.firmy.cz/detail/14057489-nohy-v-cajku-pedikura-kralovice-kralovice.html#pridat-hodnoceni"
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Ohodnotit na Firmy.cz"
                            className="flex size-11 items-center justify-center rounded-full bg-muted transition-colors hover:bg-primary/10"
                        >
                            <Image
                                src="/firmy-logo.svg"
                                alt="Firmy.cz"
                                width={32}
                                height={32}
                                className="size-5.5"
                            />
                        </a>
                    </div>
                </div>

                <div className="mt-10 border-t border-border/60 pt-6 text-center">
                    <p className="text-xs font-medium text-foreground/70">
                        Provozovatel
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {OPERATOR_INFO.name}
                        <br />
                        {OPERATOR_INFO.address}
                        <br />
                        IČO {OPERATOR_INFO.ico}
                        <br />
                        {OPERATOR_INFO.registryNote}
                    </p>
                </div>
            </div>
        </section>
    );
}
