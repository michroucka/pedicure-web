import { InteriorCarousel } from "@/components/marketing/interior-carousel.tsx";
import { SectionWave } from "@/components/marketing/section-wave.tsx";

const REASONS = [
    {
        title: "Pečlivost a profesionalita",
        body: "Na detailech záleží. Právě pečlivá práce často rozhoduje o výsledku, který nejen dobře vypadá, ale je také příjemný a komfortní.",
    },
    {
        title: "Hygiena a bezpečí",
        body: "Čistota a vysoké hygienické standardy při každém ošetření.",
    },
    {
        title: "Lidský přístup",
        body: "Přijít můžete takoví, jací jste. Neřeším, jestli jste byli na pedikúře minulý týden, nebo před pěti lety. Bez ostychu, bez posuzování, s respektem a snahou opravdu pomoci.",
    },
];

export function WhyUsSection() {
    return (
        <section className="relative bg-background">
            <div className="mx-auto grid max-w-5xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:items-center md:py-24">
                <InteriorCarousel />

                <div>
                    <h2 className="font-display text-pretty">Proč právě Nohy v cajku?</h2>
                    <p className="mt-6 text-base leading-relaxed text-pretty text-muted-foreground">
                        Dvacet let v oboru znamená tisíce hodin práce,
                        zkušeností a setkání s nejrůznějšími potřebami
                        klientů. Vím, že neexistuje jedna univerzální péče
                        pro všechny – proto se vždy dívám na to, co
                        potřebují právě vaše nohy.
                    </p>

                    <div className="mt-8 grid gap-6">
                        {REASONS.map((reason) => (
                            <div key={reason.title}>
                                <h5>{reason.title}</h5>
                                <p className="mt-2 text-sm text-pretty leading-relaxed text-muted-foreground">
                                    {reason.body}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <SectionWave
                variant="c"
                className="fill-card"
            />
        </section>
    );
}
