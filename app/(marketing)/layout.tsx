import { ReactNode } from "react";
import { MarketingNav } from "@/components/marketing/marketing-nav.tsx";
import { MarketingFooter } from "@/components/marketing/marketing-footer.tsx";
import { PortalContainerProvider } from "@/components/portal-container.tsx";

export default function MarketingLayout({
    children,
}: {
    children: ReactNode;
}) {
    return (
        <PortalContainerProvider className="storefront flex min-h-svh flex-col bg-background text-foreground">
            <MarketingNav />
            <main className="flex-1">{children}</main>
            <MarketingFooter />
        </PortalContainerProvider>
    );
}
