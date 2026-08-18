import { Booking } from "@/lib/generated/prisma/client.ts";
import { prisma } from "./prisma.ts";

export async function cancelBooking(id: string): Promise<Booking> {
    return prisma.booking.update({
        where: { id },
        data: { status: "CANCELLED" },
    });
}
