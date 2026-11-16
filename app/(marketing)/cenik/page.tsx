import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BOOKING_ENABLED } from "@/lib/booking-enabled";
import { CzechText } from "@/components/czech-text";

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
                    <h1>Ceník</h1>
                    <p className="mt-4 text-base leading-relaxed text-balance text-muted-foreground">
                        Díky svým zkušenostem dokážu péči přizpůsobit
                        individuálním potřebám vašich nohou.
                    </p>

                    <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2">
                        {services.map((service) => (
                            <Card key={service.id}>
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
                                    <p className="mt-auto pt-4 text-right font-heading text-2xl text-primary">
                                        {service.price} Kč
                                    </p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {BOOKING_ENABLED && (
                        <div className="mt-10">
                            <Button
                                asChild
                                size="lg"
                                className="w-full sm:w-auto"
                            >
                                <Link href="/rezervace">Objednat se</Link>
                            </Button>
                        </div>
                    )}
                </div>
            </section>
        </CzechText>
    );
}
