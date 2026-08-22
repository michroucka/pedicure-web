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
        <section className="bg-background">
            <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 md:py-24">
                <h2 className="font-display">Proč právě Nohy v cajku?</h2>
                <p className="mt-6 max-w-prose text-base leading-relaxed text-muted-foreground">
                    Dvacet let v oboru znamená tisíce hodin práce, zkušeností
                    a setkání s nejrůznějšími potřebami klientů. Vím, že
                    neexistuje jedna univerzální péče pro všechny – proto se
                    vždy dívám na to, co potřebují právě vaše nohy.
                </p>

                <div className="mt-10 grid gap-8 sm:grid-cols-3">
                    {REASONS.map((reason) => (
                        <div key={reason.title}>
                            <h5>{reason.title}</h5>
                            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                                {reason.body}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
