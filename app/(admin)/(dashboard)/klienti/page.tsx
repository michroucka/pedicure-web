import type { Metadata } from "next";
import { prisma } from "@/lib/prisma.ts";
import { ClientList } from "@/components/admin/client-list.tsx";

export const metadata: Metadata = {
    title: "Klienti",
};

export default async function ClientsPage() {
    const clients = await prisma.client.findMany({
        orderBy: { name: "asc" },
    });

    return (
        <div className="mx-auto w-full max-w-lg">
            <h2 className="px-4 pt-4 text-center">Klienti</h2>
            <ClientList clients={clients} />
        </div>
    );
}
