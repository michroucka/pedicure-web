import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button.tsx";

const NAV_LINKS = [
    { href: "/#o-mne", label: "O mně" },
    { href: "/cenik", label: "Ceník" },
    { href: "/kontakt", label: "Kontakt" },
];

export function MarketingNav() {
    return (
        <header className="sticky top-0 z-10 border-b border-border/60 bg-background/90 backdrop-blur">
            <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
                <Link
                    href="/"
                    className="shrink-0"
                >
                    <Image
                        src="/logo-banner-light.svg"
                        alt="Nohy v cajku"
                        width={131}
                        height={50}
                        className="h-9 w-auto"
                        priority
                    />
                </Link>

                <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
                    {NAV_LINKS.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className="transition-colors hover:text-foreground"
                        >
                            {link.label}
                        </Link>
                    ))}
                </nav>

                <Button
                    asChild
                    size="sm"
                >
                    <Link href="/reservation">Objednat se</Link>
                </Button>
            </div>
        </header>
    );
}
