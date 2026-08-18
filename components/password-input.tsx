"use client";

import { ComponentProps, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input.tsx";
import { cn } from "@/lib/utils.ts";

export function PasswordInput({
    className,
    ...props
}: ComponentProps<typeof Input>) {
    const [visible, setVisible] = useState(false);

    return (
        <div className="relative">
            <Input
                {...props}
                type={visible ? "text" : "password"}
                className={cn("pr-8", className)}
            />
            <button
                type="button"
                onClick={() => setVisible((v) => !v)}
                tabIndex={-1}
                aria-label={visible ? "Skrýt heslo" : "Zobrazit heslo"}
                className="absolute inset-y-0 right-2 flex w-8 items-center justify-center text-muted-foreground hover:text-foreground"
            >
                {visible ? (
                    <EyeOff className="size-5" />
                ) : (
                    <Eye className="size-5" />
                )}
            </button>
        </div>
    );
}
