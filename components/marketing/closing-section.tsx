import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BOOKING_ENABLED } from "@/lib/booking-enabled";
import { CzechText } from "@/components/czech-text";

export function ClosingSection() {
    return (
        <CzechText>
            <section className="bg-background">
                <div className="reveal mx-auto max-w-2xl px-4 py-16 text-center sm:px-6 md:py-20">
                    <h2 className="text-pretty italic">
                        Vaše nohy v dobrých rukou
                    </h2>
                    <p className="mx-auto mt-4 max-w-prose text-base leading-relaxed text-pretty text-muted-foreground">
                        Po 20 letech praxe stále platí, že mě těší vidět rozdíl,
                        který může kvalitní péče udělat – od unavených a
                        zanedbaných chodidel až po pocit lehkosti, pohodlí a
                        upravenosti. Pedikúra totiž není jen o tom, jak vaše
                        nohy vypadají, ale i o tom, jak se v nich cítíte.
                    </p>
                    <p className="mt-8 text-sm text-pretty text-muted-foreground">
                        Ať už potřebujete pravidelnou pedikúru, řešíte konkrétní
                        problém, nebo si chcete jednoduše dopřát chvíli pro
                        sebe, budu se na vás těšit.
                    </p>
                    {BOOKING_ENABLED && (
                        <Button
                            asChild
                            size="lg"
                            className="mt-6"
                        >
                            <Link href="/rezervace">Objednat se</Link>
                        </Button>
                    )}
                </div>
            </section>
        </CzechText>
    );
}
