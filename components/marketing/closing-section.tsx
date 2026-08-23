import Link from "next/link";
import { Button } from "@/components/ui/button.tsx";
import { SectionWave } from "@/components/marketing/section-wave.tsx";

export function ClosingSection() {
    return (
        <section className="relative bg-background">
            <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6 md:py-24">
                <h2 className="font-display italic">Vaše nohy v dobrých rukou</h2>
                <p className="mx-auto mt-4 max-w-prose text-base leading-relaxed text-muted-foreground">
                    Po 20 letech praxe stále platí, že mě těší vidět rozdíl,
                    který může kvalitní péče udělat – od unavených a
                    zanedbaných chodidel až po pocit lehkosti, pohodlí a
                    upravenosti. Pedikúra totiž není jen o tom, jak vaše
                    nohy vypadají, ale i o tom, jak se v nich cítíte.
                </p>
                <p className="mt-8 text-sm text-muted-foreground">
                    Ať už potřebujete pravidelnou pedikúru, řešíte konkrétní
                    problém, nebo si chcete jednoduše dopřát chvíli pro
                    sebe, budu se na vás těšit.
                </p>
                <Button
                    asChild
                    size="lg"
                    className="mt-6"
                >
                    <Link href="/rezervace">Objednat se</Link>
                </Button>
            </div>

            <SectionWave
                variant="e"
                className="fill-card"
            />
        </section>
    );
}
