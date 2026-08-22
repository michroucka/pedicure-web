import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button.tsx";

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
                            <Link href="/reservation">Objednat se</Link>
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

                <div className="relative aspect-4/5 overflow-hidden rounded-4xl bg-muted">
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Image
                            src="/icon-light.svg"
                            alt=""
                            width={160}
                            height={160}
                            className="size-2/5 opacity-40"
                        />
                    </div>
                    <p className="absolute inset-x-0 bottom-3 text-center text-xs text-muted-foreground italic">
                        fotka, doplní se
                    </p>
                </div>
            </div>
        </section>
    );
}
