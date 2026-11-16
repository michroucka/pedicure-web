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
        // Top safe-area padding: the page paints under the status bar
        // (viewportFit "cover"), and iPadOS 26 blurs whatever sits there -
        // the keep-awake banner was half smeared. Now only plain
        // background is under it, like the bottom nav's inset below.
        <div className="flex h-svh flex-col pt-[env(safe-area-inset-top)]">
            <KeepAwake />
            <main className="flex-1 scrollbar-gutter-both overflow-y-auto pt-2">
                {children}
            </main>
            <AdminBottomNav />
            <PushResubscribe />
        </div>
    );
}
