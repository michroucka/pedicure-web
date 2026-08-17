"use server"

import {findOrCreateClient} from "@/lib/find-or-create-client.ts";
import {createBooking} from "@/lib/create-booking.ts";
import { redirect } from "next/navigation"
import { Prisma } from "@/lib/generated/prisma/client"

export async function submitBooking(
    context: { date: Date; serviceId: string; startTime: number },
    formData: FormData
) {
    const name = formData.get("name") as string;
    const phone = formData.get("phone") as string;
    const emailValue = formData.get("email") as string;
    const email = emailValue ? String(emailValue) : undefined;
    const client = await findOrCreateClient(phone, name, email);

    const serviceId = context.serviceId;
    const date = context.date;
    const startTime = context.startTime;
    const source = "ONLINE";
    let booking: Awaited<ReturnType<typeof createBooking>>;
    try {
        booking = await createBooking({clientId: client.id, serviceId, date, startTime, source});
    } catch (error) {
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
        ) {
            console.error(error)
            const dateParam = date.toISOString().slice(0, 10);
            const params = new URLSearchParams({
                date: dateParam,
                service: serviceId,
                error: "slot_taken",
            })
            redirect(`/reservation?${params.toString()}`)
        } else {
            throw error;
        }
    }

    redirect(`/reservation/confirmed?id=${booking.id}`);
}