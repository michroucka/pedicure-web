import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth.ts";
import { AdminBottomNav } from "@/components/admin/admin-bottom-nav.tsx";

export const metadata: Metadata = {
    title: {
        template: "%s – Nohy v cajku Admin",
        default: "Nohy v cajku Admin",
    },
};

export default async function AdminDashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();
    if (!session?.user) {
        redirect("/login");
    }

    return (
        <div className="flex min-h-svh flex-col">
            <main className="flex-1 overflow-y-auto">{children}</main>
            <AdminBottomNav />
        </div>
    );
}
