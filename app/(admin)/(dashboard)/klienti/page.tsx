import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getCzechToday } from "@/lib/utils";
import { ClientList } from "@/components/admin/client-list";

export const metadata: Metadata = {
    title: "Klienti",
};

export default async function ClientsPage() {
    // Hidden ("deleted") clients stay in the DB for their bookings' sake,
    // but never show up here.
    const clients = await prisma.client.findMany({
        where: { active: true },
        orderBy: { name: "asc" },
        include: {
            // For the delete confirmation – upcoming bookings stay in the
            // calendar, which the pedikérka should know before deleting.
            _count: {
                select: {
                    bookings: {
                        where: {
                            status: "CONFIRMED",
                            date: { gte: getCzechToday() },
                        },
                    },
                },
            },
        },
    });

    return (
        <div className="mx-auto w-full max-w-lg md:max-w-2xl">
            <ClientList
                clients={clients.map(({ _count, ...c }) => ({
                    ...c,
                    upcomingBookings: _count.bookings,
                }))}
            />
        </div>
    );
}
