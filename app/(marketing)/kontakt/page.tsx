import Link from "next/link";
import { Button } from "@/components/ui/button.tsx";

export default function KontaktPage() {
    return (
        <section>
            <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 md:py-24">
                <h1 className="italic">Kontakt</h1>
                <p className="mt-4 max-w-prose text-base leading-relaxed text-muted-foreground">
                    Dopřejte svým nohám péči zkušených rukou. Ať už
                    potřebujete pravidelnou pedikúru, řešíte konkrétní
                    problém, nebo si chcete jednoduše dopřát chvíli pro
                    sebe, budu se na vás těšit.
                </p>

                <dl className="mt-8 flex flex-col gap-3 text-sm">
                    <div className="flex gap-2">
                        <dt className="text-muted-foreground">Telefon:</dt>
                        <dd className="italic text-muted-foreground">
                            doplní se
                        </dd>
                    </div>
                    <div className="flex gap-2">
                        <dt className="text-muted-foreground">Adresa:</dt>
                        <dd className="italic text-muted-foreground">
                            doplní se
                        </dd>
                    </div>
                </dl>

                <Button
                    asChild
                    size="lg"
                    className="mt-8"
                >
                    <Link href="/reservation">Objednat se online</Link>
                </Button>
            </div>
        </section>
    );
}
