import type { Metadata, Viewport } from "next";
import { ReactNode } from "react";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { BookingNav } from "@/components/rezervace/booking-nav";
import { PortalContainerProvider } from "@/components/portal-container";

export const metadata: Metadata = {
    title: "Rezervace",
};

export const viewport: Viewport = {
    themeColor: "#38252A",
};

export default function ReservationLayout({
    children,
}: {
    children: ReactNode;
}) {
    return (
        <PortalContainerProvider className="storefront min-h-svh bg-background text-foreground">
            <BookingNav />
            {/* Bottom padding for every step's action buttons, plus the iOS
                home indicator area (the page draws under it, viewportFit
                "cover"). */}
            <div className="mt-3 pb-[calc(--spacing(6)+env(safe-area-inset-bottom))] max-lg:mx-4 md:mt-8">
                {children}
            </div>
            <Analytics />
            <SpeedInsights />
        </PortalContainerProvider>
    );
}
