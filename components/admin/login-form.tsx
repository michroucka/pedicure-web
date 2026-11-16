"use client";

import { useActionState } from "react";
import { AlertCircle, Lock, User } from "lucide-react";
import { loginAction, type LoginState } from "@/app/(admin)/login/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/password-input";
import { LoginSubmitButton } from "@/components/admin/login-submit-button";

export function LoginForm() {
    const [state, formAction] = useActionState<LoginState, FormData>(
        loginAction,
        {}
    );

    return (
        <>
            {state.error && (
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
            <form action={formAction}>
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
                            // React resets the form after the action; the
                            // returned name comes back as the default.
                            defaultValue={state.username}
                            autoFocus={!state.error}
                        />
                    </Field>
                    <Field>
                        <FieldLabel htmlFor="password">
                            <Lock className="size-4" />
                            Heslo
                        </FieldLabel>
                        {/* After a failed attempt the cursor goes straight
                            to the (now empty) password. key remounts it so
                            autoFocus applies again on every failure. */}
                        <PasswordInput
                            key={state.error ? "retry" : "first"}
                            id="password"
                            name="password"
                            autoComplete="current-password"
                            required
                            autoFocus={!!state.error}
                        />
                    </Field>
                </FieldGroup>
                <LoginSubmitButton />
            </form>
        </>
    );
}
