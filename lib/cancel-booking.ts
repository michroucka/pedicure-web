import { Booking } from "@/lib/generated/prisma/client.ts";
import { prisma } from "./prisma.ts";

export async function cancelBooking(id: string): Promise<Booking> {
    return prisma.booking.update({
        where: { id },
        data: { status: "CANCELLED" },
    });
}

export async function cancelGroupBooking(groupId: string): Promise<void> {
    await prisma.booking.updateMany({
        where: { groupId, status: "CONFIRMED" },
        data: { status: "CANCELLED" },
    });
}
