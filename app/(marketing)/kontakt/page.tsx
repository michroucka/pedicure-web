import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button.tsx";
import { Mail, MapPin, Phone } from "lucide-react";

export const metadata: Metadata = {
    title: "Kontakt",
};

export default function KontaktPage() {
    return (
        <section>
            <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 md:py-24">
                <h1 className="italic">Kontakt</h1>
                <p className="mt-4 max-w-prose text-base leading-relaxed text-muted-foreground">
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
                        src="https://mapy.com/s/basasacuha"
                        width="100%"
                        height={280}
                        style={{ border: "none", display: "block" }}
                    />
                </div>

                <div className="mt-8 flex justify-end">
                    <Button
                        asChild
                        size="lg"
                    >
                        <Link href="/rezervace">Objednat se online</Link>
                    </Button>
                </div>
            </div>
        </section>
    );
}
