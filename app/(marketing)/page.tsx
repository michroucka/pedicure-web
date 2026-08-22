import { HeroSection } from "@/components/marketing/hero-section.tsx";
import { AboutSection } from "@/components/marketing/about-section.tsx";
import { WhyUsSection } from "@/components/marketing/why-us-section.tsx";
import { AftercareSection } from "@/components/marketing/aftercare-section.tsx";
import { ClosingSection } from "@/components/marketing/closing-section.tsx";

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
