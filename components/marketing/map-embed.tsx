"use client";

import { useState } from "react";
import Image from "next/image";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";

const MAP_QUERY =
    "x=13.4847511111&y=49.9803738889&z=17&source=firm&id=14057489";
const MAP_HEIGHT = 280;

// The mapy.com iframe stores Seznam's tracking identifiers (User-Id cookie,
// DOT analytics in localStorage), which need prior consent. Loading it only
// after an explicit click is that consent — no cookie banner needed.
// The blurred backdrop is a static, self-hosted OpenStreetMap snapshot
// (public/map-placeholder.webp) — no third-party request before the click.
export function MapEmbed() {
    const [showMap, setShowMap] = useState(false);

    return (
        <div className="mt-6 overflow-hidden rounded-2xl border border-border">
            {showMap ? (
                <iframe
                    src={`https://mapy.com/cs/zakladni?${MAP_QUERY}&widgetFirmy=14057489&frame=1`}
                    title="Mapa provozovny"
                    width="100%"
                    height={MAP_HEIGHT}
                    style={{ border: "none", display: "block" }}
                />
            ) : (
                <div
                    className="relative isolate flex flex-col items-center justify-center gap-3 px-5 text-center"
                    style={{ height: MAP_HEIGHT }}
                >
                    <Image
                        src="/map-placeholder.webp"
                        alt=""
                        fill
                        sizes="672px"
                        className="-z-10 scale-110 object-cover blur-[3px]"
                    />
                    <div className="absolute inset-0 -z-10 bg-card/60" />
                    <MapPin className="size-8 text-primary" />
                    <Button
                        variant="outline"
                        onClick={() => setShowMap(true)}
                    >
                        Zobrazit mapu
                    </Button>
                    <p className="max-w-xs text-xs leading-relaxed text-pretty text-muted-foreground">
                        Načte obsah ze služby Mapy.com, která může ukládat
                        cookies. Případně{" "}
                        <a
                            href={`https://mapy.com/cs/zakladni?${MAP_QUERY}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline underline-offset-2 transition-colors hover:text-foreground"
                        >
                            otevřít v Mapy.com
                        </a>
                        .
                    </p>
                    <a
                        href="https://www.openstreetmap.org/copyright"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute right-2 bottom-1 text-[10px] text-muted-foreground"
                    >
                        © OpenStreetMap
                    </a>
                </div>
            )}
        </div>
    );
}
