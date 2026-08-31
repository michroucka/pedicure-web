import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button.tsx";
import { Mail, MapPin, Phone, Star } from "lucide-react";
import { BOOKING_ENABLED } from "@/lib/booking-enabled.ts";
import Image from "next/image";

export const metadata: Metadata = {
    title: "Kontakt",
    description:
        "Kontakt na pedikúru Nohy v cajku – Boženy Němcové 204, Kralovice. Telefon, e-mail a mapa provozovny.",
    alternates: { canonical: "/kontakt" },
};

export default function KontaktPage() {
    return (
        <section>
            <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 md:py-24">
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
                        <a href="tel:+420739665010">+420 739 665 010</a>
                    </dd>

                    <dt className="flex items-center gap-1 text-muted-foreground">
                        <Mail className="size-4" />
                        E-Mail:
                    </dt>
                    <dd className="text-muted-foreground italic">
                        <a href="mailto:rouckova@pedikurakralovice.cz">
                            rouckova@pedikurakralovice.cz
                        </a>
                    </dd>

                    <dt className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="size-4" />
                        Adresa:
                    </dt>
                    <dd className="text-muted-foreground italic">
                        Boženy Němcové 204, Kralovice
                    </dd>
                </dl>

                <div className="mt-6 overflow-hidden rounded-2xl border border-border">
                    <iframe
                        src="https://mapy.com/cs/zakladni?x=13.4847511111&y=49.9803738889&z=17&source=firm&id=14057489&widgetFirmy=14057489&frame=1"
                        width="100%"
                        height={280}
                        style={{ border: "none", display: "block" }}
                    />
                </div>

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

                {BOOKING_ENABLED && (
                    <div className="mt-8 flex justify-end">
                        <Button
                            asChild
                            size="lg"
                        >
                            <Link href="/rezervace">Objednat se online</Link>
                        </Button>
                    </div>
                )}
            </div>
        </section>
    );
}
