"use server"

import { z } from "zod";
import { auth, signOut } from "@/auth.ts";
import { prisma } from "@/lib/prisma.ts";
import { sendPushNotification } from "@/lib/send-push.ts";
import argon2 from "argon2";

const changePasswordSchema = z
    .object({
        currentPassword: z.string().min(1, "Zadejte současné heslo."),
        newPassword: z.string().min(8, "Nové heslo musí mít alespoň 8 znaků."),
        confirmPassword: z.string(),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
        message: "Hesla se neshodují.",
        path: ["confirmPassword"],
    });

export type ChangePasswordState = { ok: boolean; error?: string } | null;

export async function changePasswordAction(
    _prevState: ChangePasswordState,
    formData: FormData
): Promise<ChangePasswordState> {
    const session = await auth();
    if (!session?.user?.name) return { ok: false, error: "Nejste přihlášeni." };

    const parsed = changePasswordSchema.safeParse({
        currentPassword: formData.get("currentPassword"),
        newPassword: formData.get("newPassword"),
        confirmPassword: formData.get("confirmPassword"),
    });
    if (!parsed.success) {
        return { ok: false, error: parsed.error.issues[0].message };
    }

    const admin = await prisma.adminUser.findUnique({
        where: { username: session.user.name },
    });
    if (!admin) return { ok: false, error: "Účet nebyl nalezen." };
    if (
        !(await argon2.verify(admin.passwordHash, parsed.data.currentPassword))
    ) {
        return { ok: false, error: "Současné heslo není správné." };
    }

    const newHash = await argon2.hash(parsed.data.newPassword);
    await prisma.adminUser.update({
        where: { id: admin.id },
        data: { passwordHash: newHash },
    });
    await signOut({ redirectTo: "/login?passwordChanged=1" });
    return null;
}

export async function savePushSubscriptionAction({
    endpoint,
    p256dh,
    auth: subAuth,
    userAgent,
}: {
    endpoint: string;
    p256dh: string;
    auth: string;
    userAgent?: string;
}) {
    const session = await auth();
    if (!session?.user?.name) return { ok: false, error: "Nejste přihlášeni." };

    const admin = await prisma.adminUser.findUnique({
        where: { username: session.user.name },
    });
    if (!admin) return { ok: false, error: "Účet nebyl nalezen." };

    await prisma.pushSubscription.upsert({
        where: { endpoint },
        update: { p256dh, auth: subAuth, userAgent },
        create: { adminUserId: admin.id, endpoint , p256dh , auth: subAuth, userAgent }
    })
}

export async function deletePushSubscriptionAction(endpoint: string) {
    const session = await auth();
    if (!session?.user?.name) return { ok: false, error: "Nejste přihlášeni." };

    await prisma.pushSubscription.deleteMany({ where: { endpoint } });
}

export async function sendTestPushAction() {
    const session = await auth();
    if (!session?.user?.name) return { ok: false, error: "Nejste přihlášeni." };

    await sendPushNotification({
        title: "Testovací notifikace",
        body: "Funguje to!",
        url: "/nastaveni",
    });
    return { ok: true };
}