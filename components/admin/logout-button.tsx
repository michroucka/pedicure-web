"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { LogOut } from "lucide-react";

export function LogoutButton() {
    const { pending } = useFormStatus();

    return (
        <Button
            type="submit"
            variant="destructive"
            size="lg"
            className="w-full"
            disabled={pending}
        >
            {pending ? (
                <Spinner className="size-4" />
            ) : (
                <LogOut className="size-4" />
            )}
            {pending ? "Odhlašuji…" : "Odhlásit se"}
        </Button>
    );
}
