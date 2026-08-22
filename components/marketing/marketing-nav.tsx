import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button.tsx";

const NAV_LINKS = [
    { href: "/#o-mne", label: "O mně" },
    { href: "/cenik", label: "Ceník" },
    { href: "/kontakt", label: "Kontakt" },
];

function NavLinks() {
    return (
        <>
            {NAV_LINKS.map((link) => (
                <Link
                    key={link.href}
                    href={link.href}
                    className="transition-colors hover:text-foreground"
                >
                    {link.label}
                </Link>
            ))}
        </>
    );
}

export function MarketingNav() {
    return (
        <header className="sticky top-0 z-10 border-b border-border/60 bg-background/90 backdrop-blur">
            <div className="mx-auto max-w-5xl px-4 sm:px-6">
                <div className="flex items-center justify-between gap-4 py-3">
                    <Link
                        href="/"
                        className="shrink-0"
                    >
                        <Image
                            src="/logo-banner-light.svg"
                            alt="Nohy v cajku"
                            width={241}
                            height={60}
                            className="-my-1 h-14 w-auto"
                            priority
                            draggable={false}
                        />
                    </Link>

                    <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
                        <NavLinks />
                    </nav>

                    <Button asChild>
                        <Link href="/rezervace">Objednat se</Link>
                    </Button>
                </div>

                <nav className="flex items-center justify-center border-t border-border/60 gap-8 py-2 -mx-4 text-muted-foreground md:hidden">
                    <NavLinks />
                </nav>
            </div>
        </header>
    );
}
