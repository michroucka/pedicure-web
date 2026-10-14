"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma.ts";
import { requireAdmin } from "@/lib/require-admin.ts";
import { normalizeExtraMinutes } from "@/lib/extra-time.ts";

export async function updateClientAction(
    id: string,
    data: {
        name: string;
        phone: string;
        email: string;
        extraTimeMinutes: number;
        note: string;
    }
) {
    await requireAdmin();
    await prisma.client.update({
        where: { id },
        data: {
            name: data.name,
            phone: data.phone || null,
            email: data.email || null,
            extraTimeMinutes: normalizeExtraMinutes(data.extraTimeMinutes),
            note: data.note || null,
        },
    });

    revalidatePath("/klienti");
}

// "Smazat" in the UI. A client without any booking is really deleted; one
// with bookings (past or cancelled ones too) can't be — the bookings must
// stay in the calendar and Booking.clientId is required — so it's only
// hidden (active: false) from the client list and the name autocomplete.
// A hidden client who books again gets matched and reactivated (see
// findOrCreateClient).
// Counting first rather than catching the FK error from delete: with the
// pg driver adapter that error comes back as a generic code (P2039), not a
// stable FK one, so the explicit check is the reliable signal.
export async function deleteClientAction(id: string): Promise<void> {
    await requireAdmin();
    await prisma.$transaction(async (tx) => {
        const bookingCount = await tx.booking.count({ where: { clientId: id } });
        if (bookingCount === 0) {
            await tx.client.delete({ where: { id } });
        } else {
            await tx.client.update({ where: { id }, data: { active: false } });
        }
    });

    revalidatePath("/klienti");
    // the add-booking dialog's name autocomplete lists clients too
    revalidatePath("/kalendar");
}
