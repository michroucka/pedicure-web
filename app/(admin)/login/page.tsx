import type { Metadata } from "next";
import { auth, signIn } from "@/auth.ts";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { PasswordInput } from "@/components/password-input.tsx";
import { LoginSubmitButton } from "@/components/admin/login-submit-button.tsx";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { AlertCircle, Lock, User } from "lucide-react";

export const metadata: Metadata = {
    title: {
        absolute: "Přihlášení | Nohy v cajku Admin",
    },
};

export default async function AdminLoginPage({
    searchParams,
}: {
    searchParams: Promise<{ error?: string }>;
}) {
    const { error } = await searchParams;

    const session = await auth();
    if (session?.user) {
        redirect("/kalendar");
    }

    async function login(formData: FormData) {
        "use server";
        try {
            await signIn("credentials", {
                username: formData.get("username"),
                password: formData.get("password"),
                redirectTo: "/kalendar",
            });
        } catch (err) {
            if (err instanceof AuthError) {
                redirect(`/login?error=${err.type}`);
            }
            throw err;
        }
    }

    return (
        <div className="mx-auto flex min-h-svh max-w-sm items-center p-4">
            <Card className="w-full">
                <CardContent>
                    <h2 className="mb-4 text-center">Přihlášení</h2>
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
                    <form action={login}>
                        <FieldGroup>
                            <Field>
                                <FieldLabel htmlFor="username">
                                    <User className="size-4" />
                                    Uživatelské jméno
                                </FieldLabel>
                                <Input
                                    id="username"
                                    name="username"
                                    autoComplete="username"
                                    required
                                    autoFocus
                                />
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="password">
                                    <Lock className="size-4" />
                                    Heslo
                                </FieldLabel>
                                <PasswordInput
                                    id="password"
                                    name="password"
                                    autoComplete="current-password"
                                    required
                                />
                            </Field>
                        </FieldGroup>
                        <LoginSubmitButton />
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
