import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { BOOKING_ENABLED } from "@/lib/booking-enabled";
import { CzechText } from "@/components/czech-text";
import { stagger } from "@/lib/stagger";

export const metadata: Metadata = {
    title: "Ceník",
    description:
        "Ceník pedikúry v Kralovicích – přehled služeb a jejich délky. Objednejte se online během chvilky.",
    alternates: { canonical: "/cenik" },
};

export default async function CenikPage() {
    const services = await prisma.service.findMany({
        where: { active: true },
        orderBy: { durationMinutes: "asc" },
    });

    return (
        <CzechText>
            <section>
                <div className="mx-auto max-w-5xl px-4 pt-12 pb-12 sm:px-6 md:pt-16">
                    <h1
                        className="enter"
                        style={stagger(0)}
                    >
                        Ceník
                    </h1>
                    <p
                        className="enter mt-4 text-base leading-relaxed text-balance text-muted-foreground"
                        style={stagger(1)}
                    >
                        Díky svým zkušenostem dokážu péči přizpůsobit
                        individuálním potřebám vašich nohou.
                    </p>

                    <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2">
                        {services.map((service, i) => (
                            <Card
                                key={service.id}
                                // Hover lift: the cards are the page's content
                                // people point at, so they feel tangible. The
                                // whole card is the "Objednat" link (stretched
                                // over it), so the focus ring goes on the card.
                                className="group/service enter relative transition-[translate,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-lg hover:ring-primary/30 has-focus-visible:ring-2 has-focus-visible:ring-ring"
                                style={stagger(2 + i)}
                            >
                                <CardContent className="flex h-full flex-col">
                                    <div className="flex items-baseline justify-between gap-4">
                                        <h2 className="text-lg font-medium">
                                            {service.name}
                                        </h2>
                                        <p className="shrink-0 text-sm text-muted-foreground">
                                            {service.durationMinutes} minut
                                        </p>
                                    </div>
                                    {service.description && (
                                        <p className="mt-3 text-sm text-pretty text-muted-foreground">
                                            {service.description}
                                        </p>
                                    )}
                                    <div className="mt-auto flex items-center justify-between gap-4 pt-4">
                                        <p className="font-heading text-2xl text-primary">
                                            {service.price} Kč
                                        </p>
                                        {BOOKING_ENABLED && (
                                            <Link
                                                href={`/rezervace?services=${service.id}`}
                                                aria-label={`Objednat – ${service.name}`}
                                                className="flex min-h-11 items-center gap-1.5 text-sm font-medium outline-none group-hover/service:underline group-hover/service:underline-offset-4 after:absolute after:inset-0"
                                            >
                                                Objednat
                                                <ArrowRight className="size-4 transition-transform group-hover/service:translate-x-0.5" />
                                            </Link>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>
        </CzechText>
    );
}
