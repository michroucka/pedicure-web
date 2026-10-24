import type { Metadata, Viewport } from "next";
import { ReactNode } from "react";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { BookingNav } from "@/components/rezervace/booking-nav.tsx";
import { PortalContainerProvider } from "@/components/portal-container.tsx";

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
            <div className="mt-8 max-lg:mx-4">
                {children}
            </div>
            <Analytics />
            <SpeedInsights />
        </PortalContainerProvider>
    );
}
