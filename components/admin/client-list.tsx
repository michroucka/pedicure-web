"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { ClientEditDialog } from "@/components/admin/client-edit-dialog";
import { ChevronRight, Clock, Phone, Search } from "lucide-react";
import { normalizeForSearch } from "@/lib/utils";
import type { Client } from "@/lib/generated/prisma/client";

export type ClientListItem = Client & { upcomingBookings: number };

export function ClientList({ clients }: { clients: ClientListItem[] }) {
    const [query, setQuery] = useState("");
    const [selected, setSelected] = useState<ClientListItem | null>(null);

    const normalized = normalizeForSearch(query.trim());
    const filtered = normalized
        ? clients.filter(
              (c) =>
                  normalizeForSearch(c.name).includes(normalized) ||
                  (c.phone?.includes(normalized) ?? false)
          )
        : clients;

    return (
        <div className="flex flex-col gap-3 px-4 pb-4">
            {/* Stays reachable while scrolling a long list. */}
            <div className="sticky top-2 z-10 -mx-4 bg-background px-4 pb-1">
                <div className="relative">
                    <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Hledat podle jména nebo telefonu"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="pl-8"
                    />
                </div>
            </div>

            {filtered.length === 0 ? (
                <span className="py-6 text-center text-sm text-muted-foreground">
                    Žádný klient nenalezen.
                </span>
            ) : (
                <div className="divide-y overflow-hidden rounded-2xl border">
                    {filtered.map((client) => (
                        <button
                            key={client.id}
                            type="button"
                            onClick={() => setSelected(client)}
                            className="flex min-h-11 w-full items-center gap-3 px-4 py-1.5 text-left transition hover:bg-muted/50"
                        >
                            <span className="flex min-w-0 flex-1 items-center gap-2">
                                <span className="truncate font-medium">
                                    {client.name}
                                </span>
                                {client.extraTimeMinutes > 0 && (
                                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                                        <Clock className="size-3" />+
                                        {client.extraTimeMinutes} min
                                    </span>
                                )}
                            </span>
                            {client.phone && (
                                <span className="flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground">
                                    <Phone className="size-3.5" />
                                    {client.phone}
                                </span>
                            )}
                            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                        </button>
                    ))}
                </div>
            )}

            <ClientEditDialog
                client={selected}
                onOpenChange={(open) => !open && setSelected(null)}
            />
        </div>
    );
}
