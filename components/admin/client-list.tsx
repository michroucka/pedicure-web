"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input.tsx";
import { ClientEditDialog } from "@/components/admin/client-edit-dialog.tsx";
import { Clock, Phone, Search } from "lucide-react";
import { normalizeForSearch } from "@/lib/utils.ts";
import type { Client } from "@/lib/generated/prisma/client.ts";

export function ClientList({ clients }: { clients: Client[] }) {
    const [query, setQuery] = useState("");
    const [selected, setSelected] = useState<Client | null>(null);

    const normalized = normalizeForSearch(query.trim());
    const filtered = normalized
        ? clients.filter(
              (c) =>
                  normalizeForSearch(c.name).includes(normalized) ||
                  c.phone.includes(normalized)
          )
        : clients;

    return (
        <div className="flex flex-col gap-3 p-4">
            <div className="relative">
                <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    placeholder="Hledat podle jména nebo telefonu"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="pl-8"
                />
            </div>

            {filtered.length === 0 ? (
                <span className="py-6 text-center text-sm text-muted-foreground">
                    Žádný klient nenalezen.
                </span>
            ) : (
                <div className="divide-y overflow-hidden rounded-md border">
                    {filtered.map((client) => (
                        <button
                            key={client.id}
                            type="button"
                            onClick={() => setSelected(client)}
                            className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition hover:bg-muted/50"
                        >
                            <span className="min-w-0 truncate font-medium">
                                {client.name}
                            </span>
                            <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                                {client.extraTimeMinutes > 0 && (
                                    <span className="flex items-center gap-1">
                                        <Clock className="size-3.5" />+
                                        {client.extraTimeMinutes} min
                                    </span>
                                )}
                                <span className="flex items-center gap-1">
                                    <Phone className="size-3.5" />
                                    {client.phone}
                                </span>
                            </div>
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
