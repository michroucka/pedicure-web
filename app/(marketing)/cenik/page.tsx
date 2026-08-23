import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma.ts";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";

export const metadata: Metadata = {
    title: "Ceník",
};

export default async function CenikPage() {
    const services = await prisma.service.findMany({
        where: { active: true },
        orderBy: { durationMinutes: "asc" },
    });

    return (
        <section>
            <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 md:py-24">
                <h1 className="italic">Ceník</h1>
                <p className="mt-4 max-w-prose text-pretty text-base leading-relaxed text-muted-foreground">
                    Díky svým zkušenostem dokážu péči přizpůsobit
                    individuálním potřebám vašich nohou.
                </p>

                <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2">
                    {services.map((service) => (
                        <Card key={service.id}>
                            <CardContent className="flex h-full flex-col">
                                <p className="font-heading text-lg font-medium">
                                    {service.name}
                                </p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {service.durationMinutes} minut
                                </p>
                                {service.description && (
                                    <p className="mt-3 text-sm text-muted-foreground">
                                        {service.description}
                                    </p>
                                )}
                                <p className="mt-auto pt-4 font-heading text-2xl text-primary">
                                    {service.price} Kč
                                </p>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="mt-10 flex justify-end">
                    <Button
                        asChild
                        size="lg"
                    >
                        <Link href="/rezervace">Objednat se</Link>
                    </Button>
                </div>
            </div>
        </section>
    );
}
