"use client";

import { useState, type CSSProperties } from "react";
import Image from "next/image";
import { Map as MapIcon, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { BUSINESS_INFO } from "@/lib/business-info";

// mapy.com takes x = longitude, y = latitude.
const MAP_QUERY = `x=${BUSINESS_INFO.geo.longitude}&y=${BUSINESS_INFO.geo.latitude}&z=17&source=firm&id=${BUSINESS_INFO.mapyFirmId}`;

// The mapy.com iframe stores Seznam's tracking identifiers (User-Id cookie,
// DOT analytics in localStorage), which need prior consent. Loading it only
// after an explicit click is that consent – no cookie banner needed.
// The blurred backdrop is a static, self-hosted OpenStreetMap snapshot
// (public/map-placeholder.webp) – no third-party request before the click.
export function MapEmbed({
    className,
    style,
}: {
    className?: string;
    style?: CSSProperties;
}) {
    const [mapState, setMapState] = useState<"idle" | "loading" | "loaded">(
        "idle"
    );

    return (
        <div
            className={cn(
                "relative isolate h-70 overflow-hidden rounded-2xl border border-border",
                className
            )}
            style={style}
        >
            {/* The iframe stays invisible until it has loaded, so the
                blurred backdrop covers the blank frame instead of flashing
                an empty card. */}
            {mapState !== "idle" && (
                <iframe
                    src={`https://mapy.com/cs/zakladni?${MAP_QUERY}&widgetFirmy=${BUSINESS_INFO.mapyFirmId}&frame=1`}
                    title="Mapa provozovny"
                    onLoad={() => setMapState("loaded")}
                    className={cn(
                        "absolute inset-0 z-10 block size-full border-none transition-opacity duration-300 motion-reduce:transition-none",
                        mapState === "loaded" ? "opacity-100" : "opacity-0"
                    )}
                />
            )}

            {/* Stays mounted under the map so nothing blank shows through
                while the iframe fades in. */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-5 text-center">
                <Image
                    src="/map-placeholder.webp"
                    alt=""
                    fill
                    sizes="672px"
                    className="-z-10 scale-110 object-cover blur-[3px]"
                />
                <div className="absolute inset-0 -z-10 bg-card/60" />
                {mapState === "idle" ? (
                    <>
                        <MapPin className="size-8 text-primary" />
                        <Button
                            variant="outline"
                            size="lg"
                            onClick={() => setMapState("loading")}
                            className="bg-background shadow-lg hover:bg-background"
                        >
                            <MapIcon className="size-4" />
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
                    </>
                ) : (
                    <Spinner
                        className="size-8 text-primary"
                        aria-label="Načítám mapu"
                    />
                )}
                <a
                    href="https://www.openstreetmap.org/copyright"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute right-2 bottom-1 text-[10px] text-muted-foreground"
                >
                    © OpenStreetMap
                </a>
            </div>
        </div>
    );
}
