import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BOOKING_ENABLED } from "@/lib/booking-enabled";
import { SectionWave } from "@/components/marketing/section-wave";
import { CzechText } from "@/components/czech-text";

export function HeroSection() {
    return (
        <CzechText>
            <section className="relative flex min-h-[calc(100svh-4rem)] flex-col justify-center overflow-hidden md:min-h-[min(calc(100svh-5rem),56rem)]">
                <div className="mx-auto grid w-full max-w-5xl items-center gap-10 px-4 pt-8 pb-16 sm:px-6 md:grid-cols-2 md:pb-20">
                    <div>
                        <h1 className="text-pretty italic">
                            Vaše nohy vás nosí celý život.
                        </h1>
                        <p className="mt-4 max-w-prose text-lg text-pretty text-muted-foreground">
                            Každý den, na každém kroku. A právě proto si
                            zaslouží kvalitní a profesionální péči – už 20 let.
                        </p>
                        <div className="mt-8 flex flex-wrap gap-3">
                            {BOOKING_ENABLED && (
                                <Button
                                    asChild
                                    size="lg"
                                >
                                    <Link href="/rezervace">Objednat se</Link>
                                </Button>
                            )}
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
                        style={{
                            borderRadius: "62% 38% 55% 45% / 45% 55% 45% 55%",
                        }}
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
        </CzechText>
    );
}
