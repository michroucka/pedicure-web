"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { LogIn } from "lucide-react";

export function LoginSubmitButton() {
    const { pending } = useFormStatus();

    return (
        <Button
            type="submit"
            className="mt-6 w-full"
            disabled={pending}
        >
            {pending ? (
                <Spinner className="size-4" />
            ) : (
                <LogIn className="size-4" />
            )}
            {pending ? "Přihlašuji…" : "Přihlásit se"}
        </Button>
    );
}
