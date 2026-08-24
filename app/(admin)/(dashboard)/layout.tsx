import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth.ts";
import { AdminBottomNav } from "@/components/admin/admin-bottom-nav.tsx";

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
    // (including soft client-side navigation between these pages) — this
    // layout only re-renders on a hard load, so it's a defense-in-depth
    // backstop, not the main gate.
    const session = await auth();
    if (!session?.user) {
        redirect("/login");
    }

    return (
        <div className="flex h-svh flex-col">
            <main className="flex-1 overflow-y-auto">{children}</main>
            <AdminBottomNav />
        </div>
    );
}
