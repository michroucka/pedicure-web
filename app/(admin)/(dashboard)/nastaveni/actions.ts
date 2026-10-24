"use server"

import { z } from "zod";
import { signOut } from "@/auth.ts";
import { prisma } from "@/lib/prisma.ts";
import { requireAdmin } from "@/lib/require-admin.ts";
import argon2 from "argon2";

const changePasswordSchema = z
    .object({
        currentPassword: z.string().min(1, "Zadejte současné heslo."),
        newPassword: z
            .string()
            .min(8, "Nové heslo musí mít alespoň 8 znaků.")
            // argon2 hashes whatever it gets - no reason to accept megabytes.
            .max(256, "Nové heslo může mít nejvýš 256 znaků."),
        confirmPassword: z.string(),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
        message: "Hesla se neshodují.",
        path: ["confirmPassword"],
    });

// What PushSubscription.toJSON() gives the browser — endpoint is the push
// service URL web-push will POST to, so it has to be a real https URL.
const pushSubscriptionSchema = z.object({
    endpoint: z.url({ protocol: /^https$/ }).max(2000),
    p256dh: z.string().min(1).max(200),
    auth: z.string().min(1).max(200),
    userAgent: z.string().max(500).optional(),
});

export type ChangePasswordState = { ok: boolean; error?: string } | null;

export async function changePasswordAction(
    _prevState: ChangePasswordState,
    formData: FormData
): Promise<ChangePasswordState> {
    const username = await requireAdmin();

    const parsed = changePasswordSchema.safeParse({
        currentPassword: formData.get("currentPassword"),
        newPassword: formData.get("newPassword"),
        confirmPassword: formData.get("confirmPassword"),
    });
    if (!parsed.success) {
        return { ok: false, error: parsed.error.issues[0].message };
    }

    const admin = await prisma.adminUser.findUnique({
        where: { username },
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
    const username = await requireAdmin();
    const parsed = pushSubscriptionSchema.safeParse({ endpoint, p256dh, auth: subAuth, userAgent });
    if (!parsed.success) return { ok: false, error: "Neplatné údaje o zařízení." };
    ({ endpoint, p256dh, auth: subAuth, userAgent } = parsed.data);

    const admin = await prisma.adminUser.findUnique({
        where: { username },
    });
    if (!admin) return { ok: false, error: "Účet nebyl nalezen." };

    await prisma.pushSubscription.upsert({
        where: { endpoint },
        update: { p256dh, auth: subAuth, userAgent },
        create: { adminUserId: admin.id, endpoint , p256dh , auth: subAuth, userAgent }
    })
}

export async function deletePushSubscriptionAction(endpoint: string) {
    await requireAdmin();
    if (!z.string().max(2000).safeParse(endpoint).success) return;

    await prisma.pushSubscription.deleteMany({ where: { endpoint } });
}