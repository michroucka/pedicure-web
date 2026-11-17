"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRightIcon, MenuIcon, PhoneIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetDescription,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { BOOKING_ENABLED } from "@/lib/booking-enabled";
import { BUSINESS_INFO } from "@/lib/business-info";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
    { href: "/#o-mne", label: "O mně" },
    { href: "/cenik", label: "Ceník" },
    { href: "/kontakt", label: "Kontakt" },
];

// A link to "/#o-mne" while already on "/#o-mne" is a no-op for both the
// browser and Next.js (same URL), so after scrolling away the click would do
// nothing. On the homepage, section links therefore scroll by hand.
function findSamePageSection(href: string, pathname: string) {
    const [path, hash] = href.split("#");
    if (!hash || path !== pathname) return null;
    return document.getElementById(hash);
}

// Updates the address bar without telling Next.js. Its patched
// history.replaceState treats the change as a navigation (a React
// transition re-rendering the page) in the middle of the smooth scroll.
// Next's own history state is kept as is.
function replaceUrlQuietly(href: string) {
    History.prototype.replaceState.call(
        window.history,
        window.history.state,
        "",
        href
    );
}

function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Smooth only here, within the homepage - arriving from another page jumps
// straight to the section (Next.js's own hash scroll).
function scrollToSection(section: HTMLElement, href: string) {
    section.scrollIntoView({
        behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
    replaceUrlQuietly(href);
}

function useIsScrolled() {
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const updateIsScrolled = () => setIsScrolled(window.scrollY > 8);
        updateIsScrolled();
        window.addEventListener("scroll", updateIsScrolled, { passive: true });
        return () => window.removeEventListener("scroll", updateIsScrolled);
    }, []);

    return isScrolled;
}

export function MarketingNav() {
    const pathname = usePathname();
    const isScrolled = useIsScrolled();

    return (
        <header
            className={cn(
                "sticky top-0 z-10 border-b bg-background pt-[env(safe-area-inset-top)] transition-[border-color,box-shadow] duration-200",
                isScrolled
                    ? "border-border/60 shadow-[0_6px_20px_-12px_rgb(0_0_0/0.6)]"
                    : "border-transparent"
            )}
        >
            <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
                <Link
                    href="/"
                    className="shrink-0"
                    onClick={(event) => {
                        // Already home: "/" is the same page (or a hash
                        // away), so a navigation would either do nothing or
                        // replay the page transition. Just go back to the top.
                        if (pathname !== "/") return;
                        event.preventDefault();
                        window.scrollTo({
                            top: 0,
                            behavior: prefersReducedMotion()
                                ? "auto"
                                : "smooth",
                        });
                        replaceUrlQuietly("/");
                    }}
                >
                    <Image
                        src="/logo-banner-light.svg"
                        alt="Nohy v cajku"
                        width={221}
                        height={60}
                        className="-my-1 h-10 w-auto sm:h-12 md:h-14"
                        priority
                        draggable={false}
                    />
                </Link>

                <div className="flex items-center gap-2 md:gap-8">
                    <nav className="hidden items-center gap-8 font-heading text-lg md:flex">
                        {NAV_LINKS.map((link) => {
                            const isActive = pathname === link.href;
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    aria-current={isActive ? "page" : undefined}
                                    onClick={(event) => {
                                        const section = findSamePageSection(
                                            link.href,
                                            pathname
                                        );
                                        if (!section) return;
                                        event.preventDefault();
                                        scrollToSection(section, link.href);
                                    }}
                                    className={cn(
                                        "transition-colors hover:text-primary",
                                        isActive
                                            ? "text-primary"
                                            : "text-foreground"
                                    )}
                                >
                                    {link.label}
                                </Link>
                            );
                        })}
                    </nav>

                    {BOOKING_ENABLED && (
                        <Button
                            asChild
                            className="hidden min-[360px]:inline-flex"
                        >
                            <Link href="/rezervace">Objednat se</Link>
                        </Button>
                    )}

                    <MobileMenu pathname={pathname} />
                </div>
            </div>
        </header>
    );
}

function MobileMenu({ pathname }: { pathname: string }) {
    const [isOpen, setIsOpen] = useState(false);
    // The open sheet locks page scrolling, so a section link only records
    // where to go; the scroll happens once the sheet has fully closed.
    const pendingSectionHref = useRef<string | null>(null);

    function handleLinkClick(event: MouseEvent, href: string) {
        if (!findSamePageSection(href, pathname)) return;
        event.preventDefault();
        pendingSectionHref.current = href;
        setIsOpen(false);
    }

    return (
        <Sheet
            open={isOpen}
            onOpenChange={setIsOpen}
        >
            <SheetTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon-lg"
                    className="md:hidden"
                    aria-label="Otevřít menu"
                >
                    <MenuIcon className="size-6" />
                </Button>
            </SheetTrigger>
            <SheetContent
                side="right"
                showCloseButton={false}
                onCloseAutoFocus={(event) => {
                    const href = pendingSectionHref.current;
                    pendingSectionHref.current = null;
                    const section = href
                        ? findSamePageSection(href, pathname)
                        : null;
                    if (!href || !section) return;
                    // Returning focus to the menu button would yank the page
                    // back to the header.
                    event.preventDefault();
                    scrollToSection(section, href);
                }}
                className="w-4/5 gap-0 border-border/60 bg-background px-6 pt-[calc(env(safe-area-inset-top)+4.5rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)]"
            >
                {/* Exactly where the menu button sits in the header, so the
                    icon just turns from ☰ into ✕. */}
                <SheetClose asChild>
                    <Button
                        variant="ghost"
                        size="icon-lg"
                        className="absolute top-[calc(env(safe-area-inset-top)+--spacing(3))] right-4 sm:right-6"
                        aria-label="Zavřít menu"
                    >
                        <XIcon className="size-6" />
                    </Button>
                </SheetClose>
                <SheetTitle className="sr-only">Menu</SheetTitle>
                <SheetDescription className="sr-only">
                    Navigace webu
                </SheetDescription>
                <nav className="flex flex-col">
                    {NAV_LINKS.map((link) => {
                        const isActive = pathname === link.href;
                        return (
                            <SheetClose
                                key={link.href}
                                asChild
                            >
                                <Link
                                    href={link.href}
                                    aria-current={isActive ? "page" : undefined}
                                    onClick={(event) =>
                                        handleLinkClick(event, link.href)
                                    }
                                    className={cn(
                                        "flex min-h-12 items-center justify-between border-b border-border/60 font-heading text-xl",
                                        isActive
                                            ? "text-primary"
                                            : "text-foreground"
                                    )}
                                >
                                    {link.label}
                                    <ChevronRightIcon className="size-5 text-muted-foreground" />
                                </Link>
                            </SheetClose>
                        );
                    })}
                </nav>
                {BOOKING_ENABLED && (
                    <SheetClose asChild>
                        <Button
                            asChild
                            size="lg"
                            className="mt-8 w-full"
                        >
                            <Link href="/rezervace">Objednat se</Link>
                        </Button>
                    </SheetClose>
                )}
                <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="mt-3 w-full"
                >
                    <a href={`tel:${BUSINESS_INFO.phone}`}>
                        <PhoneIcon data-icon="inline-start" />
                        Zavolat {BUSINESS_INFO.phoneDisplay}
                    </a>
                </Button>
            </SheetContent>
        </Sheet>
    );
}
