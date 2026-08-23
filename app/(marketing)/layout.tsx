import type { Viewport } from "next";
import { ReactNode } from "react";
import { MarketingNav } from "@/components/marketing/marketing-nav.tsx";
import { MarketingFooter } from "@/components/marketing/marketing-footer.tsx";
import { PortalContainerProvider } from "@/components/portal-container.tsx";
import { SafeAreaBottomSentinel } from "@/components/safe-area-bottom-sentinel.tsx";

export const viewport: Viewport = {
    themeColor: "#38252A",
};

// LocalBusiness structured data — lets Google tie this site to the same
// business as the Google Business Profile/Firmy.cz listings instead of
// treating them as unrelated. TODO: once Firmy.cz confirms the listing,
// add its share link to `sameAs` too.
const LOCAL_BUSINESS_JSON_LD = {
    "@context": "https://schema.org",
    "@type": "HealthAndBeautyBusiness",
    name: "Nohy v cajku",
    image: "https://pedikurakralovice.cz/portret.jpg",
    url: "https://pedikurakralovice.cz",
    telephone: "+420739665010",
    email: "rouckova@pedikurakralovice.cz",
    address: {
        "@type": "PostalAddress",
        streetAddress: "Boženy Němcové 204",
        addressLocality: "Kralovice",
        addressCountry: "CZ",
    },
    sameAs: ["https://share.google/XDsBQ20HE2i1sQsJj"],
};

export default function MarketingLayout({
    children,
}: {
    children: ReactNode;
}) {
    return (
        <PortalContainerProvider className="storefront flex min-h-svh flex-col bg-background text-foreground">
            <script
                type="application/ld+json"
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(LOCAL_BUSINESS_JSON_LD),
                }}
            />
            <MarketingNav />
            <main className="flex-1">{children}</main>
            <MarketingFooter />
            <SafeAreaBottomSentinel />
        </PortalContainerProvider>
    );
}
