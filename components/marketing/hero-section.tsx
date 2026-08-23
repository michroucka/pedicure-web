import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button.tsx";
import { SectionWave } from "@/components/marketing/section-wave.tsx";

export function HeroSection() {
    return (
        <section className="relative overflow-hidden">
            <div className="mx-auto grid max-w-5xl items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:py-24">
                <div>
                    <h1 className="italic text-pretty">Vaše nohy vás nosí celý život.</h1>
                    <p className="mt-4 max-w-prose text-pretty text-lg text-muted-foreground">
                        Každý den, na každém kroku. A právě proto si zaslouží
                        kvalitní a profesionální péči – už 20 let.
                    </p>
                    <div className="mt-8 flex flex-wrap gap-3">
                        <Button
                            asChild
                            size="lg"
                        >
                            <Link href="/rezervace">Objednat se</Link>
                        </Button>
                        <Button
                            asChild
                            variant="outline"
                            size="lg"
                        >
                            <Link href="/cenik">Prohlédnout ceník</Link>
                        </Button>
                    </div>
                </div>

                <div
                    className="relative aspect-4/5 overflow-hidden bg-muted"
                    style={{ borderRadius: "62% 38% 55% 45% / 45% 55% 45% 55%" }}
                >
                    <Image
                        src="/portret.jpg"
                        alt="Kateřina Roučková, pedikérka"
                        fill
                        sizes="(min-width: 768px) 40vw, 90vw"
                        className="object-cover"
                        priority
                    />
                </div>
            </div>

            <SectionWave
                variant="a"
                className="fill-card"
            />
        </section>
    );
}
