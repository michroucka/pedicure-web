import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma.ts";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { formatTime } from "@/lib/utils.ts";

export default async function ConfirmedPage({
    searchParams,
}: {
    searchParams: Promise<{ id?: string }>;
}) {
    const { id } = await searchParams;

    if (!id) notFound();

    const booking = await prisma.booking.findUnique({
        where: { id },
        include: { client: true, service: true },
    });

    if (!booking) notFound();

    return (
        <div>
            <h1>Rezervace potvrzena</h1>
            <p>{booking.client.name}</p>
            <p>{booking.service.name}</p>
            <p>{format(booking.date, "d. MMMM yyyy", { locale: cs })}</p>
            <p>
                {formatTime(booking.startTime)}–{formatTime(booking.endTime)}
            </p>
        </div>
    );
}
