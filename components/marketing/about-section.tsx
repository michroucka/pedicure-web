const PRINCIPLES = [
    "pečlivém a individuálním přístupu",
    "profesionální péči",
    "čistotě a vysokých hygienických standardech",
    "pohodové a přátelské atmosféře",
];

export function AboutSection() {
    return (
        <section
            id="o-mne"
            className="scroll-mt-20 bg-card"
        >
            <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 md:py-24">
                <h2 className="font-display">O mně</h2>
                <div className="mt-6 flex flex-col gap-4 text-base leading-relaxed text-card-foreground/90">
                    <p>
                        Pedikúra pro mě není jen práce. Je to obor, kterému se
                        věnuji už dvě desetiletí.
                    </p>
                    <p>
                        Za 20 let praxe jsem získala nejen odborné zkušenosti,
                        ale také jistotu, že kvalitní péče není jen o správné
                        technice. Je také o pečlivosti, trpělivosti, lidském
                        přístupu a schopnosti vnímat, co konkrétní člověk
                        potřebuje.
                    </p>
                    <p>
                        Každý klient je jiný. Někdo přichází pravidelně pro
                        chvíli péče a relaxace, jiný řeší ztvrdlou či suchou
                        kůži, namáhaná chodidla nebo potřebuje své nohy dát
                        jednoduše zase do pořádku. A právě v tom vám díky
                        svým dlouholetým zkušenostem ráda pomohu.
                    </p>
                </div>

                <p className="mt-8 text-sm font-medium tracking-wide text-muted-foreground uppercase">
                    Zakládám si na
                </p>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                    {PRINCIPLES.map((principle) => (
                        <li
                            key={principle}
                            className="flex items-start gap-2 text-sm text-card-foreground/90"
                        >
                            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                            {principle}
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}
