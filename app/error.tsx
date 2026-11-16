"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

// Without this, an unexpected server error shows Next.js's default English
// page. Kept neutral (no marketing nav) because it also catches admin errors.
export default function ErrorPage({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <main className="flex min-h-svh items-center justify-center bg-background text-foreground">
            <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center sm:px-6">
                <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
                    <TriangleAlert className="size-7 text-primary" />
                </div>
                <h1 className="mt-6 italic">Něco se pokazilo</h1>
                <p className="mt-4 max-w-prose text-base leading-relaxed text-pretty text-muted-foreground">
                    Stránku se nepodařilo načíst. Zkuste to prosím znovu, a
                    pokud potíže trvají, zavolejte mi.
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                    <Button
                        size="lg"
                        onClick={reset}
                    >
                        <RotateCw className="size-4" />
                        Zkusit znovu
                    </Button>
                    <Button
                        asChild
                        size="lg"
                        variant="outline"
                    >
                        <Link href="/">Zpět na hlavní stránku</Link>
                    </Button>
                </div>
            </div>
        </main>
    );
}
