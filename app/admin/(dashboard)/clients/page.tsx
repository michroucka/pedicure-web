import { prisma } from "@/lib/prisma.ts";
import { ClientList } from "@/components/admin/client-list.tsx";

export default async function ClientsPage() {
    const clients = await prisma.client.findMany({
        orderBy: { name: "asc" },
    });

    return (
        <div className="mx-auto w-full max-w-lg">
            <h1 className="px-4 pt-4 text-center">Klienti</h1>
            <ClientList clients={clients} />
        </div>
    );
}
