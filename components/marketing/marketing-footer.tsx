import Image from "next/image";
import Link from "next/link";
import { BUSINESS_INFO, OPERATOR_INFO } from "@/lib/business-info.ts";

export function MarketingFooter() {
    return (
        // On pages that end with a SectionWave (marked `data-wave-end`), the
        // wave already provides the gap above the footer in the footer's own
        // color — drop the top padding and border there so it isn't doubled.
        <footer className="border-t border-border/60 bg-card pt-4 [main:has([data-wave-end])+&]:border-t-0 [main:has([data-wave-end])+&]:pt-0">
            <div className="mx-auto flex max-w-5xl flex-row justify-between gap-6 px-4 pb-4 sm:px-6">
                <div className="flex cursor-default items-center select-none">
                    <div>
                        <p className="font-display text-lg md:text-xl">
                            {BUSINESS_INFO.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {BUSINESS_INFO.practitioner}
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

                <nav className="flex items-center gap-4 text-xs text-muted-foreground md:items-center md:gap-6 md:text-sm">
                    <Link
                        href="/#o-mne"
                        className="transition-colors hover:text-foreground"
                    >
                        O mně
                    </Link>
                    <Link
                        href="/cenik"
                        className="transition-colors hover:text-foreground"
                    >
                        Ceník
                    </Link>
                    <Link
                        href="/kontakt"
                        className="transition-colors hover:text-foreground"
                    >
                        Kontakt
                    </Link>
                </nav>
            </div>
            <div className="mx-auto flex max-w-5xl justify-center px-4 pb-4 max-sm:pt-2 sm:justify-end sm:px-6">
                <div className="flex flex-col items-center gap-3 text-xs text-muted-foreground sm:flex-row sm:gap-6">
                    <Link
                        href="/kontakt"
                        className="underline decoration-border underline-offset-2 transition-colors hover:text-foreground hover:decoration-foreground"
                    >
                        Provozovatel: {OPERATOR_INFO.name}
                    </Link>
                    <a
                        href="https://github.com/michroucka"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline decoration-border underline-offset-2 transition-colors hover:text-foreground hover:decoration-foreground"
                    >
                        Tvorba webu: Michal Roučka
                    </a>
                </div>
            </div>
        </footer>
    );
}
