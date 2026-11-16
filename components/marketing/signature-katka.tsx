import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import {
    SIGNATURE_STROKES,
    SIGNATURE_VIEWBOX,
} from "@/components/marketing/signature-strokes";

// Pen speed in viewBox units per second, and the pause while the pen is
// lifted between strokes.
const PEN_SPEED = 1200;
const PEN_LIFT_SECONDS = 0.08;
// A beat after the signature scrolls into view.
const START_DELAY_SECONDS = 0.3;
// The round line caps would paint a dot even for a zero-length dash, so the
// hidden dash is parked this far before the line's start (and the gap is
// long enough that no next dash peeks in at its end).
const CAP_CLEARANCE = 50;

const strokeTimings = SIGNATURE_STROKES.reduce<
    { delay: number; duration: number }[]
>((timings, stroke) => {
    const previous = timings.at(-1);
    const delay = previous
        ? previous.delay + previous.duration + PEN_LIFT_SECONDS
        : START_DELAY_SECONDS;
    return [...timings, { delay, duration: stroke.penLength / PEN_SPEED }];
}, []);

// The "Katka" signature, written stroke by stroke when it scrolls in: each stroke's letter pieces sit under a mask whose pen line
// draws itself (stroke-dashoffset, globals.css). Without JavaScript or with
// reduced motion the masks start fully drawn, so the signature just shows.
export function SignatureKatka({ className }: { className?: string }) {
    return (
        <svg
            viewBox={SIGNATURE_VIEWBOX}
            role="img"
            aria-label="Katka"
            // Starts writing when the signature itself is on screen - its
            // section can be in view long before the signature at its bottom.
            data-reveal-trigger
            className={cn("fill-current", className)}
        >
            <defs>
                {SIGNATURE_STROKES.map((stroke, i) => (
                    <mask
                        key={i}
                        id={`katka-tah-${i + 1}`}
                        maskUnits="userSpaceOnUse"
                    >
                        <polyline
                            points={stroke.penPoints}
                            fill="none"
                            stroke="white"
                            strokeWidth={stroke.penWidth}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="signature-pen"
                            style={
                                {
                                    "--pen-dash": `${stroke.penLength} ${stroke.penLength + 2 * CAP_CLEARANCE}`,
                                    "--pen-hidden-offset":
                                        stroke.penLength + CAP_CLEARANCE,
                                    "--pen-delay": `${strokeTimings[i].delay}s`,
                                    "--pen-duration": `${strokeTimings[i].duration}s`,
                                } as CSSProperties
                            }
                        />
                    </mask>
                ))}
            </defs>
            {SIGNATURE_STROKES.map((stroke, i) => (
                <g
                    key={i}
                    mask={`url(#katka-tah-${i + 1})`}
                >
                    {stroke.fills.map((d, j) => (
                        <path
                            key={j}
                            d={d}
                        />
                    ))}
                </g>
            ))}
        </svg>
    );
}
