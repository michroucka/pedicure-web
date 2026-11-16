import type { Metadata } from "next";
import Image from "next/image";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { LoginForm } from "@/components/admin/login-form";

export const metadata: Metadata = {
    title: {
        absolute: "Přihlášení | Nohy v cajku Admin",
    },
};

export default async function AdminLoginPage({
    searchParams,
}: {
    searchParams: Promise<{ error?: string; passwordChanged?: string }>;
}) {
    const { error, passwordChanged } = await searchParams;

    const session = await auth();
    if (session?.user) {
        redirect("/kalendar");
    }

    return (
        <div className="mx-auto flex min-h-svh max-w-sm flex-col items-center justify-center gap-6 p-4 pb-[15svh]">
            <Image
                src="/logo-banner-dark.svg"
                alt="Nohy v cajku"
                width={221}
                height={60}
                className="h-14 w-auto"
                priority
                draggable={false}
            />
            <Card className="w-full">
                <CardContent>
                    <h2 className="mb-4">Přihlášení</h2>
                    {/* Errors Auth.js redirects here itself (?error=); the
                        form shows its own failed attempts. */}
                    {error && (
                        <Alert
                            variant="destructive"
                            className="mb-4"
                        >
                            <AlertCircle />
                            <AlertTitle>Přihlášení se nezdařilo</AlertTitle>
                            <AlertDescription>
                                Zkontrolujte uživatelské jméno a heslo.
                            </AlertDescription>
                        </Alert>
                    )}
                    {passwordChanged && (
                        <Alert
                            variant="info"
                            className="mb-4"
                        >
                            <AlertCircle />
                            <AlertTitle>Heslo bylo úspěšně změněno</AlertTitle>
                            <AlertDescription>
                                Přihlaste se prosím znovu.
                            </AlertDescription>
                        </Alert>
                    )}
                    <LoginForm />
                </CardContent>
            </Card>
        </div>
    );
}
