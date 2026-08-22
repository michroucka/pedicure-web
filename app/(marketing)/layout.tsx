import { ReactNode } from "react";
import { MarketingNav } from "@/components/marketing/marketing-nav.tsx";
import { MarketingFooter } from "@/components/marketing/marketing-footer.tsx";

export default function MarketingLayout({
    children,
}: {
    children: ReactNode;
}) {
    return (
        <div className="marketing flex min-h-svh flex-col bg-background text-foreground">
            <MarketingNav />
            <main className="flex-1">{children}</main>
            <MarketingFooter />
        </div>
    );
}
