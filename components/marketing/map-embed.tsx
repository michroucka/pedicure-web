"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { ExternalLink } from "lucide-react";
import "leaflet/dist/leaflet.css";
import { cn } from "@/lib/utils";
import { BUSINESS_INFO } from "@/lib/business-info";

const { latitude, longitude } = BUSINESS_INFO.geo;
const ZOOM = 17;

// lucide "map-pin", filled with the brand colour; the tip of the pin sits on
// the address (iconAnchor at the bottom centre).
const PIN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="40" height="40" fill="var(--primary)" stroke="var(--background)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3" fill="var(--background)"/></svg>`;

// Leaflet with OpenStreetMap tiles instead of an embedded map: the tiles
// store no cookies or other identifiers, so the map loads straight away
// without consent (the mapy.com widget stores Seznam's tracking IDs). The
// tile server only gets the visitor's IP – see the privacy policy.
// Leaflet touches window, so it's imported in the effect, not at the top.
export function MapEmbed({
    className,
    style,
}: {
    className?: string;
    style?: CSSProperties;
}) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let map: import("leaflet").Map | undefined;
        let isCancelled = false;

        import("leaflet").then((L) => {
            if (isCancelled || !containerRef.current) return;
            map = L.map(containerRef.current, {
                center: [latitude, longitude],
                zoom: ZOOM,
                // A page scroll over the map must not zoom it, and on a phone
                // one finger must scroll the page, not pan the map.
                scrollWheelZoom: false,
                dragging: !L.Browser.mobile,
                attributionControl: false,
            });
            L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
                maxZoom: 19,
                className: "map-tiles",
            }).addTo(map);
            L.control
                .attribution({ prefix: false })
                .addAttribution(
                    '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>'
                )
                .addTo(map);
            L.marker([latitude, longitude], {
                icon: L.divIcon({
                    html: PIN_SVG,
                    className: "",
                    iconSize: [40, 40],
                    iconAnchor: [20, 38],
                }),
                title: BUSINESS_INFO.name,
                keyboard: false,
            }).addTo(map);
        });

        return () => {
            isCancelled = true;
            map?.remove();
        };
    }, []);

    return (
        <div
            className={cn("flex flex-col gap-2", className)}
            style={style}
        >
            <div
                ref={containerRef}
                role="region"
                aria-label="Mapa provozovny"
                className="map-embed isolate z-0 min-h-70 w-full flex-1 overflow-hidden rounded-2xl border border-border bg-card"
            />
            <a
                href={BUSINESS_INFO.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-1.5 self-end text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
                Otevřít v Mapy.com
                <ExternalLink className="size-4" />
            </a>
        </div>
    );
}
