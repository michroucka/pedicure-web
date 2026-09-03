import type { Metadata } from "next";
import { CalendarPlus } from "lucide-react";
import { signOut } from "@/auth.ts";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { LogoutButton } from "@/components/admin/logout-button.tsx";
import { ChangePasswordForm } from "@/components/admin/change-password-form.tsx";

export const metadata: Metadata = {
    title: "Nastavení",
};

export default function SettingsPage() {
    const icsUrl = `webcal://admin.pedikurakralovice.cz/api/calendar/${process.env.ICS_FEED_TOKEN}.ics`;

    async function logout() {
        "use server";
        await signOut({ redirectTo: "/login" });
    }

    return (
        <div className="mx-auto flex w-full max-w-lg flex-col gap-4 p-4">
            <h2 className="text-center">Nastavení</h2>

            <Card>
                <CardHeader>
                    <CardTitle>Kalendář</CardTitle>
                    <CardDescription>
                        Odběr rezervací v Apple Kalendáři, s automatickou
                        aktualizací.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                    <Button
                        variant="outline"
                        asChild
                    >
                        <a href={icsUrl}>
                            <CalendarPlus className="size-4" />
                            Přidat kalendář do Apple Kalendáře
                        </a>
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Změna hesla</CardTitle>
                </CardHeader>
                <CardContent>
                    <ChangePasswordForm />
                </CardContent>
            </Card>
            <form action={logout}>
                <LogoutButton />
            </form>
        </div>
    );
}
