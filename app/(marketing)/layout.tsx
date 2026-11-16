import type { Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ReactNode } from "react";
import { PageTransition } from "@/components/marketing/page-transition";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { RevealOnScroll } from "@/components/marketing/reveal-on-scroll";
import { PortalContainerProvider } from "@/components/portal-container";
import { BUSINESS_INFO } from "@/lib/business-info";

export const viewport: Viewport = {
    themeColor: "#38252A",
};

// LocalBusiness structured data – lets Google tie this site to the same
// business as the Google Business Profile/Firmy.cz listings instead of
// treating them as unrelated.
const LOCAL_BUSINESS_JSON_LD = {
    "@context": "https://schema.org",
    "@type": "HealthAndBeautyBusiness",
    name: BUSINESS_INFO.name,
    image: `${BUSINESS_INFO.siteUrl}/portret.jpg`,
    url: BUSINESS_INFO.siteUrl,
    telephone: BUSINESS_INFO.phone,
    email: BUSINESS_INFO.email,
    address: {
        "@type": "PostalAddress",
        streetAddress: BUSINESS_INFO.address.street,
        postalCode: BUSINESS_INFO.address.postalCode,
        addressLocality: BUSINESS_INFO.address.city,
        addressCountry: "CZ",
    },
    geo: {
        "@type": "GeoCoordinates",
        ...BUSINESS_INFO.geo,
    },
    sameAs: [BUSINESS_INFO.profiles.google, BUSINESS_INFO.profiles.firmy],
};

export default function MarketingLayout({ children }: { children: ReactNode }) {
    return (
        <PortalContainerProvider className="storefront flex min-h-svh flex-col bg-background text-foreground">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(LOCAL_BUSINESS_JSON_LD),
                }}
            />
            <MarketingNav />
            {/* Route changes crossfade (Next.js navigations run as React
                transitions, which <ViewTransition> animates). */}
            <main className="flex-1">
                <PageTransition>{children}</PageTransition>
            </main>
            <MarketingFooter />
            <RevealOnScroll />
            {/* Public pages only - the admin isn't traffic worth measuring,
                and it saves the tablet two scripts. */}
            <Analytics />
            <SpeedInsights />
        </PortalContainerProvider>
    );
}
