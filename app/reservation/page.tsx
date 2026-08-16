import { prisma } from "@/lib/prisma.ts"
import { getAvailableSlots } from "@/lib/get-available-slots.ts"
import { Service } from "@/lib/generated/prisma/client"
import { ReservationFilters } from "@/components/reservation-filters.tsx"
import { formatTime } from "@/lib/utils.ts"



export default async function ReservationPage({
    searchParams,
}: {
    searchParams: Promise<{ date?: string; service?: string }>
}) {
    const { date, service } = await searchParams;
    
    const services: Service[] = await prisma.service.findMany({ where: { active: true } });
    const availableSlots: number[] = date && service ? await getAvailableSlots(new Date(date), service) : [];


    return (
        <div>
            <ReservationFilters services={services} />

            {availableSlots.map((slot) => (
                    <span key={slot} className="me-2">
                        {formatTime(slot)}
                    </span>
                ))}
        </div>
    )
}