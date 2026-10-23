import { prisma } from "@/lib/prisma.ts";
import { getCzechToday, normalizePhoneForMatch } from "@/lib/utils.ts";

// Upcoming online bookings one phone number or e-mail may hold at once (a
// group booking counts as one). Pedikúra every 4-6 weeks within the 120-day
// booking horizon fits comfortably; a bot reusing one contact doesn't.
export const MAX_UPCOMING_ONLINE_BOOKINGS = 3;

export async function hasReachedOnlineBookingLimit(
    phone: string,
    email: string
): Promise<boolean> {
    const bookings = await prisma.booking.findMany({
        where: {
            status: "CONFIRMED",
            source: "ONLINE",
            date: { gte: getCzechToday() },
            client: {
                OR: [
                    { phoneNormalized: normalizePhoneForMatch(phone) },
                    { email: { equals: email, mode: "insensitive" } },
                ],
            },
        },
        select: { id: true, groupId: true },
    });

    const distinctBookings = new Set(bookings.map((b) => b.groupId ?? b.id));
    return distinctBookings.size >= MAX_UPCOMING_ONLINE_BOOKINGS;
}
