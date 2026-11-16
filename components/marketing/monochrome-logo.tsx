import { cn } from "@/lib/utils";

// Renders a (multi-coloured) SVG logo as a single-colour silhouette in the
// current text colour, so third-party brand marks blend into the palette.
export function MonochromeLogo({
    src,
    className,
}: {
    src: string;
    className?: string;
}) {
    return (
        <span
            aria-hidden="true"
            className={cn(
                "inline-block shrink-0 bg-current mask-contain mask-center mask-no-repeat",
                className
            )}
            style={{ maskImage: `url(${src})`, WebkitMaskImage: `url(${src})` }}
        />
    );
}
