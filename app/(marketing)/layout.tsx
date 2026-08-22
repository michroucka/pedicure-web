import { ReactNode } from "react";
import { MarketingNav } from "@/components/marketing/marketing-nav.tsx";
import { MarketingFooter } from "@/components/marketing/marketing-footer.tsx";

export default function MarketingLayout({
    children,
}: {
    children: ReactNode;
}) {
    return (
        <div className="marketing min-h-svh bg-background text-foreground">
            <MarketingNav />
            {children}
            <MarketingFooter />
        </div>
    );
}
