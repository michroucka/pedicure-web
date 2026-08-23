import { SectionWave } from "@/components/marketing/section-wave.tsx";

const TIPS = [
    {
        title: "Hydratace je základ",
        body: "Každý den, ideálně večer, si chodidla namažte kvalitním krémem určeným na nohy. Zaměřte se především na paty a další místa, kde má kůže tendenci vysychat a tvrdnout.",
    },
    {
        title: "Nohy si pravidelně kontrolujte",
        body: "Sledujte, zda se neobjevuje nadměrně ztvrdlá nebo popraskaná kůže, zarůstající nehet či jiné změny. Čím dříve se problém začne řešit, tím lépe.",
    },
    {
        title: "Nohy zbytečně netrapte",
        body: "Nenoste dlouhodobě příliš těsnou nebo nepohodlnou obuv. Správně padnoucí boty mají velký vliv nejen na pohodlí, ale i na stav pokožky a nehtů.",
    },
    {
        title: "Nehty stříhejte správně",
        body: "Nehty na nohou stříhejte pokud možno rovně a rohy příliš nezakulacujte – pomůžete tím snížit riziko jejich zarůstání.",
    },
    {
        title: "Domácí péči nepřehánějte",
        body: "Ztvrdlou kůži se nesnažte odstranit najednou a příliš agresivně. Pravidelná jemná péče je lepší než občasný „velký zásah“.",
    },
];

export function AftercareSection() {
    return (
        <section className="relative bg-card">
            <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 md:py-24">
                <h2 className="font-display text-pretty">Jak pečovat o nohy po pedikúře</h2>
                <p className="mt-6 max-w-prose text-pretty text-base leading-relaxed text-card-foreground/90">
                    Po pedikúře si užijte pocit lehkých a upravených nohou.
                    Dopřáli jste svým nohám profesionální péči a chcete, aby
                    vydržely krásné, hebké a upravené co nejdéle? Stačí jim
                    věnovat pár minut pravidelné péče i doma.
                </p>

                <dl className="mt-10 grid gap-6 sm:grid-cols-2">
                    {TIPS.map((tip) => (
                        <div key={tip.title}>
                            <dt className="font-heading text-base font-medium">
                                {tip.title}
                            </dt>
                            <dd className="mt-1.5 text-sm text-pretty leading-relaxed text-muted-foreground">
                                {tip.body}
                            </dd>
                        </div>
                    ))}
                </dl>

                <div className="mt-12 border-t border-border pt-8">
                    <h3>A kdy přijít znovu?</h3>
                    <p className="mt-3 max-w-prose text-pretty text-sm leading-relaxed text-muted-foreground">
                        Většině klientů vyhovuje návštěva přibližně jednou za
                        4–6 týdnů, vždy ale záleží na individuálním stavu
                        vašich nohou a rychlosti, s jakou se tvoří ztvrdlá
                        kůže. Ať už chodíte na pedikúru celý život, nebo
                        přicházíte poprvé, společně najdeme způsob péče,
                        který bude vašim nohám vyhovovat.
                    </p>
                </div>
            </div>

            <SectionWave
                variant="d"
                className="fill-background"
            />
        </section>
    );
}
