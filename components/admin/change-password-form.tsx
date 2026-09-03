"use client";

import { useFormStatus } from "react-dom";
import { Spinner } from "@/components/ui/spinner.tsx";
import { useActionState } from "react";
import { changePasswordAction } from "@/app/(admin)/(dashboard)/nastaveni/actions.ts";
import { Alert, AlertDescription } from "@/components/ui/alert.tsx";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field.tsx";
import { Button } from "@/components/ui/button.tsx";
import { KeyRound } from "lucide-react";
import { PasswordInput } from "@/components/password-input.tsx";

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button
            type="submit"
            disabled={pending}
            className="mt-4 w-full"
        >
            {pending ? (
                <Spinner className="size-4" />
            ) : (
                <KeyRound className="size-4" />
            )}
            {pending ? "Měním heslo..." : "Změnit heslo"}
        </Button>
    );
}

export function ChangePasswordForm() {
    const [state, formAction] = useActionState(changePasswordAction, null);

    return (
        <form action={formAction}>
            {state?.error && (
                <Alert
                    variant="destructive"
                    className="mb-4"
                >
                    <AlertDescription>{state.error}</AlertDescription>
                </Alert>
            )}
            <FieldGroup>
                <Field>
                    <FieldLabel htmlFor="currentPassword">
                        Současné heslo
                    </FieldLabel>
                    <PasswordInput
                        type="password"
                        name="currentPassword"
                        id="currentPassword"
                        autoComplete="current-password"
                        required
                    />
                </Field>
                <Field>
                    <FieldLabel htmlFor="newPassword">Nové heslo</FieldLabel>
                    <PasswordInput
                        type="password"
                        name="newPassword"
                        id="newPassword"
                        autoComplete="new-password"
                        required
                    />
                </Field>
                <Field>
                    <FieldLabel htmlFor="confirmPassword">
                        Potvrzení nového hesla
                    </FieldLabel>
                    <PasswordInput
                        type="password"
                        name="confirmPassword"
                        id="confirmPassword"
                        autoComplete="new-password"
                        required
                    />
                </Field>
            </FieldGroup>
            <SubmitButton />
        </form>
    );
}
