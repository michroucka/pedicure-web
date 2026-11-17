import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { HeroSection } from "@/components/marketing/hero-section";
import { AboutSection } from "@/components/marketing/about-section";
import { WhyUsSection } from "@/components/marketing/why-us-section";
import { AftercareSection } from "@/components/marketing/aftercare-section";
import { ClosingSection } from "@/components/marketing/closing-section";

export const metadata: Metadata = {
    alternates: { canonical: "/" },
};

export default async function HomePage() {
    const cheapestService = await prisma.service.aggregate({
        where: { active: true },
        _min: { price: true },
    });

    return (
        <>
            <HeroSection fromPrice={cheapestService._min.price} />
            <AboutSection />
            <WhyUsSection />
            <AftercareSection />
            <ClosingSection />
        </>
    );
}
