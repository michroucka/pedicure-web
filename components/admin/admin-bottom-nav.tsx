"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck, CalendarClock, UsersRound } from "lucide-react";
import { cn } from "@/lib/utils.ts";

const NAV_ITEMS = [
    { href: "/admin", label: "Kalendář", icon: CalendarCheck },
    { href: "/admin/availability", label: "Dostupnost", icon: CalendarClock },
    { href: "/admin/clients", label: "Klienti", icon: UsersRound },
];

export function AdminBottomNav() {
    const pathname = usePathname();

    return (
        <nav className="sticky bottom-0 z-10 flex border-t bg-card pb-[env(safe-area-inset-bottom)]">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
                const active =
                    href === "/admin" ? pathname === href : pathname.startsWith(href);

                return (
                    <Link
                        key={href}
                        href={href}
                        className={cn(
                            "flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium text-muted-foreground",
                            active && "text-primary"
                        )}
                    >
                        <Icon className="size-6" />
                        {label}
                    </Link>
                );
            })}
        </nav>
    );
}
