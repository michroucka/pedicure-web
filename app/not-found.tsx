import type { Metadata } from "next";
import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { MarketingNav } from "@/components/marketing/marketing-nav.tsx";
import { MarketingFooter } from "@/components/marketing/marketing-footer.tsx";
import { PortalContainerProvider } from "@/components/portal-container.tsx";
import { SafeAreaBottomSentinel } from "@/components/safe-area-bottom-sentinel.tsx";

export const metadata: Metadata = {
    title: "Stránka nenalezena",
    robots: { index: false, follow: true },
};

// This file is Next.js's convention for both the 404 boundary (notFound())
// and the catch-all for URLs that don't match any route. It used to
// redirect("/") here, which meant every broken link returned a 307 instead
// of a 404. Google's own guidance specifically advises against redirecting
// dead links to the homepage — it's a confusing dead end for users (they
// don't get what they were looking for, or a signal that the link is
// gone) and a weak signal for search engines. Rendering real content (no
// redirect() call) lets Next.js return an actual 404 status.
export default function NotFound() {
    return (
        <PortalContainerProvider className="storefront flex min-h-svh flex-col bg-background text-foreground">
            <MarketingNav />
            <main className="flex flex-1 items-center justify-center">
                <section>
                    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center sm:px-6 md:py-32">
                        <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
                            <SearchX className="size-7 text-primary" />
                        </div>
                        <h1 className="mt-6 italic">Stránka nenalezena</h1>
                        <p className="mt-4 max-w-prose text-pretty text-base leading-relaxed text-muted-foreground">
                            Stránka, kterou hledáte, tu není – možná byl odkaz
                            přesunutý nebo už neplatí.
                        </p>
                        <Button
                            asChild
                            size="lg"
                            className="mt-8"
                        >
                            <Link href="/">Zpět na hlavní stránku</Link>
                        </Button>
                    </div>
                </section>
            </main>
            <MarketingFooter />
            <SafeAreaBottomSentinel />
        </PortalContainerProvider>
    );
}
