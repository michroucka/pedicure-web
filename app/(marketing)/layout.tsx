import type { Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { fontDisplay } from "@/lib/fonts.ts";
import { ReactNode } from "react";
import { MarketingNav } from "@/components/marketing/marketing-nav.tsx";
import { MarketingFooter } from "@/components/marketing/marketing-footer.tsx";
import { PortalContainerProvider } from "@/components/portal-container.tsx";
import { BUSINESS_INFO } from "@/lib/business-info.ts";

export const viewport: Viewport = {
    themeColor: "#38252A",
};

// LocalBusiness structured data — lets Google tie this site to the same
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
    sameAs: [
        "https://share.google/XDsBQ20HE2i1sQsJj",
        "https://www.firmy.cz/detail/14057489-nohy-v-cajku-pedikura-kralovice-kralovice.html",
    ],
};

export default function MarketingLayout({ children }: { children: ReactNode }) {
    return (
        <PortalContainerProvider
            className={`storefront flex min-h-svh flex-col bg-background text-foreground ${fontDisplay.variable}`}
        >
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(LOCAL_BUSINESS_JSON_LD),
                }}
            />
            <MarketingNav />
            <main className="flex-1">{children}</main>
            <MarketingFooter />
            {/* Public pages only - the admin isn't traffic worth measuring,
                and it saves the tablet two scripts. */}
            <Analytics />
            <SpeedInsights />
        </PortalContainerProvider>
    );
}
