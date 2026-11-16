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
        // The document scrolls, not <main>: iPadOS 26 paints its blurred
        // "scroll edge" over the top of an inner scroll container that
        // starts at the top of the screen, which smeared the header even
        // unscrolled. Only the week calendar (data-fills-viewport) still
        // pins the page to the viewport - its own scroller starts below the
        // day navigation, out of the blurred strip.
        <div className="flex min-h-svh flex-col pt-[env(safe-area-inset-top)] [--admin-nav-height:4.625rem] has-[[data-fills-viewport]]:md:h-svh">
            <KeepAwake />
            <main className="flex-1 pt-2 has-[[data-fills-viewport]]:md:min-h-0 has-[[data-fills-viewport]]:md:overflow-hidden">
                {children}
            </main>
            <AdminBottomNav />
            <PushResubscribe />
        </div>
    );
}
