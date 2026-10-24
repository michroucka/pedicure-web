"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma.ts";
import { requireAdmin } from "@/lib/require-admin.ts";
import { normalizeExtraMinutes } from "@/lib/extra-time.ts";
import { idSchema } from "@/lib/validation.ts";
import { updateClientInputSchema } from "./schema.ts";

const NOT_FOUND_ERROR = "Klient nebyl nalezen.";

export async function updateClientAction(
    id: string,
    data: {
        name: string;
        phone: string;
        email: string;
        extraTimeMinutes: number;
        note: string;
    }
): Promise<{ ok: true } | { ok: false; error: string }> {
    await requireAdmin();
    if (!idSchema.safeParse(id).success)
        return { ok: false, error: NOT_FOUND_ERROR };
    const parsed = updateClientInputSchema.safeParse(data);
    if (!parsed.success) {
        return {
            ok: false,
            error: parsed.error.issues[0]?.message ?? "Neplatné údaje.",
        };
    }

    // updateMany instead of update: an unknown id is a count of 0, not a
    // thrown P2025 (the client could've been deleted in another tab).
    const { count } = await prisma.client.updateMany({
        where: { id },
        data: {
            name: parsed.data.name,
            phone: parsed.data.phone || null,
            email: parsed.data.email || null,
            extraTimeMinutes: normalizeExtraMinutes(
                parsed.data.extraTimeMinutes
            ),
            note: parsed.data.note || null,
        },
    });
    if (count === 0) return { ok: false, error: NOT_FOUND_ERROR };

    revalidatePath("/klienti");
    return { ok: true };
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
    if (!idSchema.safeParse(id).success) return;
    // deleteMany/updateMany: an already-deleted client is a no-op, not a
    // thrown P2025 — the end state the admin wanted is reached either way.
    await prisma.$transaction(async (tx) => {
        const bookingCount = await tx.booking.count({
            where: { clientId: id },
        });
        if (bookingCount === 0) {
            await tx.client.deleteMany({ where: { id } });
        } else {
            await tx.client.updateMany({
                where: { id },
                data: { active: false },
            });
        }
    });

    revalidatePath("/klienti");
    // the add-booking dialog's name autocomplete lists clients too
    revalidatePath("/kalendar");
}
