import webpush from "web-push";
import { prisma } from "@/lib/prisma.ts";

type PushPayload = { title: string; body: string; url?: string};

async function sendOne(
    sub: { endpoint: string; p256dh: string; auth: string },
    payload: PushPayload
) {
    const subMapped = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
    };
    try {
        await webpush.sendNotification(subMapped, JSON.stringify(payload));
    } catch (err) {
        if (
            err instanceof webpush.WebPushError &&
            (err.statusCode == 404 || err.statusCode == 410)
        ) {
            await prisma.pushSubscription.delete({
                where: { endpoint: sub.endpoint },
            });
            console.log(
                "Nalezena mrtvá push subscription - záznam v DB byl smazán"
            );
        } else {
            console.error(err);
        }
    }
}

export async function sendPushNotification(payload: PushPayload): Promise<void> {
    const vapidSubject = process.env.VAPID_SUBJECT;
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    if (!vapidSubject || !vapidPublicKey || !vapidPrivateKey) return;

    webpush.setVapidDetails(
        vapidSubject,
        vapidPublicKey,
        vapidPrivateKey,
    );

    const subscriptions = await prisma.pushSubscription.findMany();
    await Promise.allSettled(subscriptions.map((sub) => sendOne(sub, payload)));
}