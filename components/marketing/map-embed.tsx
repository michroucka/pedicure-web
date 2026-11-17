import type { CSSProperties } from "react";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { BUSINESS_INFO } from "@/lib/business-info";

const { latitude, longitude } = BUSINESS_INFO.geo;

// About a street block around the address (≈ zoom 17 at the card's size).
const LONGITUDE_SPAN = 0.002;
const LATITUDE_SPAN = 0.00085;
const BBOX = [
    longitude - LONGITUDE_SPAN,
    latitude - LATITUDE_SPAN,
    longitude + LONGITUDE_SPAN,
    latitude + LATITUDE_SPAN,
].join(",");

// OpenStreetMap, not the mapy.com widget: the OSM embed stores no cookies
// or other identifiers, so it can load straight away without consent
// (mapy.com stores Seznam's tracking IDs and had to wait for a click). It
// only sends the visitor's IP to OSM - see the privacy policy.
export function MapEmbed({
    className,
    style,
}: {
    className?: string;
    style?: CSSProperties;
}) {
    return (
        <div
            className={cn("flex flex-col gap-2", className)}
            style={style}
        >
            <iframe
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${BBOX}&layer=mapnik&marker=${latitude},${longitude}`}
                title="Mapa provozovny"
                loading="lazy"
                className="block min-h-70 w-full flex-1 rounded-2xl border border-border"
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
