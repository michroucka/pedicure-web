import Image from "next/image";
import { SectionWave } from "@/components/marketing/section-wave";
import { CzechText } from "@/components/czech-text";

const PRINCIPLES = [
    "pečlivém a individuálním přístupu",
    "profesionální péči",
    "čistotě a vysokých hygienických standardech",
    "pohodové a přátelské atmosféře",
];

export function AboutSection() {
    return (
        <CzechText>
            <section
                id="o-mne"
                className="relative scroll-mt-20 bg-card"
            >
                <div className="reveal mx-auto max-w-3xl px-4 py-16 sm:px-6 md:py-20">
                    <Image
                        src="/logo-light.svg"
                        alt="Nohy v cajku"
                        width={160}
                        height={160}
                        className="float-right mb-4 ml-6 size-40 md:size-48"
                        draggable={false}
                    />

                    <h2>O mně</h2>
                    <div className="mt-6 space-y-4 text-base leading-relaxed text-pretty text-card-foreground/90">
                        <p>
                            Pedikúra pro mě není jen práce. Je to obor, kterému
                            se věnuji už dvě desetiletí.
                        </p>
                        <p>
                            Za 20 let praxe jsem získala nejen odborné
                            zkušenosti, ale také jistotu, že kvalitní péče není
                            jen o správné technice. Je také o pečlivosti,
                            trpělivosti, lidském přístupu a schopnosti vnímat,
                            co konkrétní člověk potřebuje.
                        </p>
                        <p>
                            Každý klient je jiný. Někdo přichází pravidelně pro
                            chvíli péče a relaxace, jiný řeší ztvrdlou či suchou
                            kůži, namáhaná chodidla nebo potřebuje své nohy dát
                            jednoduše zase do pořádku. A právě v tom vám díky
                            svým dlouholetým zkušenostem ráda pomohu.
                        </p>
                    </div>

                    <div
                        role="img"
                        aria-label="Katka"
                        className="clear-right mt-4 ml-auto aspect-433/221 w-24 -rotate-3 bg-primary mask-[url(/podpis-katka.svg)] mask-contain mask-no-repeat md:w-32"
                    />

                    <p className="clear-right mt-8 text-sm font-medium tracking-wide text-muted-foreground uppercase">
                        Zakládám si na
                    </p>
                    <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                        {PRINCIPLES.map((principle) => (
                            <li
                                key={principle}
                                className="flex items-start gap-2 text-sm text-pretty text-card-foreground/90"
                            >
                                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                                {principle}
                            </li>
                        ))}
                    </ul>
                </div>

                <SectionWave
                    variant="b"
                    className="fill-background"
                />
            </section>
        </CzechText>
    );
}
