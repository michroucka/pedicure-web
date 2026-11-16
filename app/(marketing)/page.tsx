import type { Metadata } from "next";
import { HeroSection } from "@/components/marketing/hero-section";
import { AboutSection } from "@/components/marketing/about-section";
import { WhyUsSection } from "@/components/marketing/why-us-section";
import { AftercareSection } from "@/components/marketing/aftercare-section";
import { ClosingSection } from "@/components/marketing/closing-section";

export const metadata: Metadata = {
    alternates: { canonical: "/" },
};

export default function HomePage() {
    return (
        <>
            <HeroSection />
            <AboutSection />
            <WhyUsSection />
            <AftercareSection />
            <ClosingSection />
        </>
    );
}
