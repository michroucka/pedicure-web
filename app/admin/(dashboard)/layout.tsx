import { AdminBottomNav } from "@/components/admin-bottom-nav.tsx";

export default function AdminDashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-svh flex-col">
            <main className="flex-1 overflow-y-auto">{children}</main>
            <AdminBottomNav />
        </div>
    );
}
