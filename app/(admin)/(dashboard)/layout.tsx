import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminBottomNav } from "@/components/admin/admin-bottom-nav";
import { PushResubscribe } from "@/components/admin/push-resubscribe";
import { KeepAwake } from "@/components/admin/keep-awake";

export const metadata: Metadata = {
    title: {
        template: "%s | Nohy v cajku Admin",
        default: "Nohy v cajku Admin",
    },
};

export default async function AdminDashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Primary enforcement is proxy.ts, which runs on every request
    // (including soft client-side navigation between these pages) – this
    // layout only re-renders on a hard load, so it's a defense-in-depth
    // backstop, not the main gate.
    const session = await auth();
    if (!session?.user) {
        redirect("/login");
    }

    return (
        // iPadOS 26 blurs the top ~40pt of an installed web app ("scroll
        // edge effect"). WebKit skips the blur and just extends the colour
        // when an opaque, full-width sticky element touches the top edge -
        // that's the strip below (it also holds the keep-awake banner). The
        // document scrolls, not <main>; only the week calendar
        // (data-fills-viewport) pins the page to the viewport and scrolls
        // inside, below its day navigation. Sticky page headers use top-2
        // to sit right under the strip.
        <div className="flex min-h-svh flex-col pt-[env(safe-area-inset-top)] [--admin-nav-height:4.625rem] has-[[data-fills-viewport]]:md:h-svh">
            <div className="sticky top-0 z-30 bg-background pb-2">
                <KeepAwake />
            </div>
            <main className="flex-1 has-[[data-fills-viewport]]:md:min-h-0">
                {children}
            </main>
            <AdminBottomNav />
            <PushResubscribe />
        </div>
    );
}
