"use client";

import { ViewTransition, type ReactNode } from "react";
import { usePathname } from "next/navigation";

// Keyed by URL, so a navigation is the old page leaving and the new one
// entering (each just fades). One shared, unkeyed <ViewTransition> would
// morph old into new instead - including its position, which slid the page
// whenever the old one had been scrolled.
export function PageTransition({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    return <ViewTransition key={pathname}>{children}</ViewTransition>;
}
