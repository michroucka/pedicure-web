import { signIn } from "@/auth.ts";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { PasswordInput } from "@/components/password-input.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { AlertCircle, LogIn, Lock, User } from "lucide-react";

export default async function AdminLoginPage({
    searchParams,
}: {
    searchParams: Promise<{ error?: string }>;
}) {
    const { error } = await searchParams;

    async function login(formData: FormData) {
        "use server";
        try {
            await signIn("credentials", {
                username: formData.get("username"),
                password: formData.get("password"),
                redirectTo: "/admin",
            });
        } catch (err) {
            if (err instanceof AuthError) {
                redirect(`/admin/login?error=${err.type}`);
            }
            throw err;
        }
    }

    return (
        <div className="mx-auto flex min-h-svh max-w-sm items-center p-4">
            <Card className="w-full">
                <CardContent>
                    <h1 className="mb-4 text-xl font-semibold">Přihlášení</h1>
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
                        <Button
                            type="submit"
                            className="mt-6 w-full"
                        >
                            <LogIn className="size-4" />
                            Přihlásit se
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
