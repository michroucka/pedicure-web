import type { Metadata } from "next";
import { CalendarPlus } from "lucide-react";
import { signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LogoutButton } from "@/components/admin/logout-button";
import { ChangePasswordSection } from "@/components/admin/change-password-form";
import { PushSubscribeFlow } from "@/components/admin/push-subscribe-flow";
import { KeepAwakeToggle } from "@/components/admin/keep-awake-toggle";

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
        <div className="mx-auto flex w-full max-w-lg flex-col gap-2 p-4">
            <SettingsSectionTitle>Obecné</SettingsSectionTitle>
            {/* The switch rows bring FieldLabel's own bordered-card look;
                inside this shared card they become plain divided rows. */}
            <div className="divide-y overflow-hidden rounded-2xl border [&_[data-slot=field-label]]:rounded-none! [&_[data-slot=field-label]]:border-0! [&_[data-slot=field-label]]:bg-transparent!">
                <div className="flex flex-col gap-3 p-4">
                    <div className="flex flex-col gap-1">
                        <span className="font-heading text-base font-medium">
                            Kalendář
                        </span>
                        <p className="text-sm text-muted-foreground">
                            Odběr rezervací v Apple Kalendáři, s automatickou
                            aktualizací.
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        asChild
                    >
                        <a href={icsUrl}>
                            <CalendarPlus className="size-4" />
                            Přidat kalendář do Apple Kalendáře
                        </a>
                    </Button>
                </div>

                <PushSubscribeFlow />

                <KeepAwakeToggle />
            </div>

            <SettingsSectionTitle className="mt-4">Účet</SettingsSectionTitle>
            <div className="divide-y overflow-hidden rounded-2xl border">
                <ChangePasswordSection />
                <form
                    action={logout}
                    className="p-4"
                >
                    <LogoutButton />
                </form>
            </div>
        </div>
    );
}

function SettingsSectionTitle({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <h2
            className={cn(
                "px-4 font-sans text-xs font-semibold tracking-wider text-muted-foreground uppercase",
                className
            )}
        >
            {children}
        </h2>
    );
}
