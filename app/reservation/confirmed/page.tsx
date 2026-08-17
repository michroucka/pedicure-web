import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma.ts";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { formatTime } from "@/lib/utils.ts";
import { StepIndicator } from "@/components/step-indicator.tsx";

export default async function ConfirmedPage({
    searchParams,
}: {
    searchParams: Promise<{ id?: string; groupId?: string; }>;
}) {
    const { id, groupId } = await searchParams;

    if (!id && !groupId) notFound();

    const bookings = await prisma.booking.findMany({
        where: { id, groupId },
        include: { client: true, service: true },
    });

    if (bookings.length === 0) notFound();

    return (
        <div>
            <StepIndicator currentStep={3} />
            <h1>Rezervace potvrzena</h1>
            {bookings.map((booking) => (
                <div key={booking.id}>
                    <p>{booking.client.name}</p>
                    <p>{booking.service.name}</p>
                </div>
            ))}
            <p>{format(bookings[0].date, "d. MMMM yyyy", { locale: cs })}</p>
            <p>
                {formatTime(bookings[0].startTime)}–{formatTime(bookings.at(-1)!.endTime)}
            </p>
        </div>
    );
}
