import Image from "next/image";
import Link from "next/link";
import { Banknote, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BOOKING_ENABLED } from "@/lib/booking-enabled";
import { SectionWave } from "@/components/marketing/section-wave";
import { CzechText } from "@/components/czech-text";
import { stagger } from "@/lib/stagger";
import { BUSINESS_INFO } from "@/lib/business-info";

// null when no service is active - the price is then left out.
export function HeroSection({ fromPrice }: { fromPrice: number | null }) {
    return (
        <CzechText>
            <section className="relative flex min-h-[calc(100svh-4rem)] flex-col justify-center overflow-hidden md:min-h-[min(calc(100svh-5rem),56rem)]">
                <div className="mx-auto grid w-full max-w-5xl items-center gap-10 px-4 pt-8 pb-16 sm:px-6 md:grid-cols-2 md:pb-20">
                    <div>
                        <h1
                            className="enter text-pretty italic md:text-5xl lg:text-6xl"
                            style={stagger(0)}
                        >
                            Vaše nohy vás nosí celý život.
                        </h1>
                        <p
                            className="enter mt-4 max-w-prose text-lg text-pretty text-muted-foreground"
                            style={stagger(1)}
                        >
                            Každý den, na každém kroku. A právě proto si
                            zaslouží kvalitní a profesionální péči – už 20 let.
                        </p>
                        <ul
                            className="enter mt-5 flex flex-wrap items-center gap-x-5 gap-y-1 text-muted-foreground"
                            style={stagger(2)}
                        >
                            <li className="flex items-center gap-1.5">
                                <MapPin className="size-4 shrink-0 text-primary" />
                                {BUSINESS_INFO.address.city}
                            </li>
                            {fromPrice !== null && (
                                <li className="flex items-center gap-1.5">
                                    <Banknote className="size-4 shrink-0 text-primary" />
                                    od {fromPrice} Kč
                                </li>
                            )}
                            <li>
                                <a
                                    href={`tel:${BUSINESS_INFO.phone}`}
                                    className="flex min-h-11 items-center gap-1.5 whitespace-nowrap underline-offset-4 transition-colors hover:text-foreground hover:underline"
                                >
                                    <Phone className="size-4 shrink-0 text-primary" />
                                    {BUSINESS_INFO.phoneDisplay}
                                </a>
                            </li>
                        </ul>
                        <div
                            className="enter mt-6 flex flex-wrap gap-3"
                            style={stagger(3)}
                        >
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
                        className="enter-scale relative aspect-4/5 overflow-hidden bg-muted"
                        style={{
                            ...stagger(1),
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
