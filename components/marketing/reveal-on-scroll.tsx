"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const REVEAL_ROOT_ATTRIBUTE = "data-reveal-ready";

// Marks every `.reveal` element as revealed the first time it scrolls into
// view; the fade/slide itself is CSS (globals.css). Re-runs on navigation
// because the marketing layout - and this component - survive it.
export function RevealOnScroll() {
    const pathname = usePathname();

    useEffect(() => {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            return;
        }

        const elements = document.querySelectorAll<HTMLElement>(
            ".reveal:not([data-revealed])"
        );

        // Anything already on screen is revealed before the hiding CSS kicks
        // in, so it never flashes out and back in.
        for (const element of elements) {
            if (element.getBoundingClientRect().top < window.innerHeight) {
                element.setAttribute("data-revealed", "");
            }
        }
        document.documentElement.setAttribute(REVEAL_ROOT_ATTRIBUTE, "");

        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (!entry.isIntersecting) continue;
                    entry.target.setAttribute("data-revealed", "");
                    observer.unobserve(entry.target);
                }
            },
            { rootMargin: "0px 0px -10% 0px" }
        );

        for (const element of elements) {
            if (!element.hasAttribute("data-revealed")) {
                observer.observe(element);
            }
        }

        return () => observer.disconnect();
    }, [pathname]);

    return null;
}
