import Image from "next/image";
import Link from "next/link";
import { Map, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";

export function MarketingFooter() {
    return (
        <footer className="border-t border-border/60 bg-card">
            <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 md:flex-row md:justify-between md:self-center">
                <div className="flex items-center">
                    <div>
                        <p className="font-display text-xl">Nohy v cajku</p>
                        <p className="text-xs text-muted-foreground">
                            Pedikúra Kralovice
                        </p>
                    </div>
                    <Image
                        src="/icon-light.svg"
                        alt=""
                        width={40}
                        height={40}
                        className="size-12"
                    />
                </div>

                <nav className="flex gap-6 self-center text-sm text-muted-foreground">
                    <Link
                        href="/#o-mne"
                        className="hover:text-foreground"
                    >
                        O mně
                    </Link>
                    <Link
                        href="/cenik"
                        className="hover:text-foreground"
                    >
                        Ceník
                    </Link>
                    <Link
                        href="/kontakt"
                        className="hover:text-foreground"
                    >
                        Kontakt
                    </Link>
                </nav>

                <div className="flex flex-col items-start text-sm text-muted-foreground">
                    <Button
                        variant="link"
                        className="p-0"
                        asChild
                    >
                        <div className="flex gap-1 italic">
                            <Phone className="size-4.5" />
                            <a href="tel:+420739665010">+420 739 665 010</a>
                        </div>
                    </Button>
                    <Button
                        variant="link"
                        className="p-0"
                        asChild
                    >
                        <div className="flex gap-1 italic">
                            <MapPin className="size-4.5" />
                            <a
                                href="https://mapy.com/s/cugekuzaba"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Boženy Němcové 204, Kralovice
                            </a>
                        </div>
                    </Button>
                </div>
            </div>
        </footer>
    );
}
