"use client";

import { useFormStatus } from "react-dom";
import { Spinner } from "@/components/ui/spinner";
import { useActionState, useState } from "react";
import { changePasswordAction } from "@/app/(admin)/(dashboard)/nastaveni/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { KeyRound, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { PasswordInput } from "@/components/password-input";

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

// Changed maybe once a year - collapsed to one row so it doesn't take
// half of the settings page.
export function ChangePasswordSection() {
    const [open, setOpen] = useState(false);

    return (
        <div>
            {/* The whole row toggles - a bigger tap target than the chevron. */}
            <button
                type="button"
                aria-expanded={open}
                aria-controls="change-password-form"
                onClick={() => setOpen((prev) => !prev)}
                className="flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-muted/50"
            >
                <span className="font-heading text-base font-medium">
                    Změna hesla
                </span>
                <ChevronDown
                    className={cn(
                        "size-5 text-muted-foreground transition-transform duration-200",
                        open && "rotate-180"
                    )}
                />
            </button>
            <div
                id="change-password-form"
                inert={!open}
                className={cn(
                    "grid transition-[grid-template-rows,opacity] duration-200 ease-out",
                    open
                        ? "grid-rows-[1fr] opacity-100"
                        : "grid-rows-[0fr] opacity-0"
                )}
            >
                <div className="min-h-0 overflow-hidden">
                    <div className="px-4 pb-4">
                        <ChangePasswordForm />
                    </div>
                </div>
            </div>
        </div>
    );
}

function ChangePasswordForm() {
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
