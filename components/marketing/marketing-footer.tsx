import Image from "next/image";
import Link from "next/link";

export function MarketingFooter() {
    return (
        <footer className="border-t border-border/60 bg-card">
            <div className="mx-auto flex max-w-5xl flex-row justify-between gap-6 px-4 py-4 sm:px-6">
                <div className="flex select-none items-center cursor-default">
                    <div>
                        <p className="font-display text-lg md:text-xl">Nohy v cajku</p>
                        <p className="text-xs text-muted-foreground">
                            Kateřina Roučková
                        </p>
                    </div>
                    <Image
                        src="/icon-light.svg"
                        alt=""
                        width={51}
                        height={51}
                        className="size-10 md:size-12"
                        draggable={false}
                    />
                </div>

                <nav className="flex items-center gap-4 text-xs md:text-sm text-muted-foreground md:items-center md:gap-6">
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
            </div>
        </footer>
    );
}
