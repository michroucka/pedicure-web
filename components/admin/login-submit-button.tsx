"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button.tsx";
import { LogIn, Loader2 } from "lucide-react";

export function LoginSubmitButton() {
    const { pending } = useFormStatus();

    return (
        <Button
            type="submit"
            className="mt-6 w-full"
            disabled={pending}
        >
            {pending ? (
                <Loader2 className="size-4 animate-spin" />
            ) : (
                <LogIn className="size-4" />
            )}
            {pending ? "Přihlašuji…" : "Přihlásit se"}
        </Button>
    );
}
