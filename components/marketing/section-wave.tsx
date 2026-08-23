import { cn } from "@/lib/utils.ts";

// Each variant is a differently-shaped wave (from Haikei, cropped to just
// the wave band of the exported canvas) so the five section seams on the
// homepage don't all look identical.
const VARIANTS = {
    a: {
        viewBox: "0 0 1440 100",
        path: "M0,50 C240,100 480,0 720,50 C960,100 1200,0 1440,50 L1440,100 L0,100 Z",
    },
    b: {
        viewBox: "0 480 900 121",
        path: "M0 518L25 511.7C50 505.3 100 492.7 150 488.2C200 483.7 250 487.3 300 488.3C350 489.3 400 487.7 450 492.2C500 496.7 550 507.3 600 514.2C650 521 700 524 750 527.5C800 531 850 535 875 537L900 539L900 601L875 601C850 601 800 601 750 601C700 601 650 601 600 601C550 601 500 601 450 601C400 601 350 601 300 601C250 601 200 601 150 601C100 601 50 601 25 601L0 601Z",
    },
    c: {
        viewBox: "0 480 900 121",
        path: "M0 524L25 519.5C50 515 100 506 150 508.2C200 510.3 250 523.7 300 527.5C350 531.3 400 525.7 450 522.5C500 519.3 550 518.7 600 522.8C650 527 700 536 750 536.7C800 537.3 850 529.7 875 525.8L900 522L900 601L875 601C850 601 800 601 750 601C700 601 650 601 600 601C550 601 500 601 450 601C400 601 350 601 300 601C250 601 200 601 150 601C100 601 50 601 25 601L0 601Z",
    },
    d: {
        viewBox: "0 480 900 121",
        path: "M0 509L30 514.5C60 520 120 531 180 528.5C240 526 300 510 360 509C420 508 480 522 540 524C600 526 660 516 720 516.7C780 517.3 840 528.7 870 534.3L900 540L900 601L870 601C840 601 780 601 720 601C660 601 600 601 540 601C480 601 420 601 360 601C300 601 240 601 180 601C120 601 60 601 30 601L0 601Z",
    },
    e: {
        viewBox: "0 480 900 121",
        path: "M0 523L30 526.2C60 529.3 120 535.7 180 540.3C240 545 300 548 360 549.3C420 550.7 480 550.3 540 547.5C600 544.7 660 539.3 720 539.8C780 540.3 840 546.7 870 549.8L900 553L900 601L870 601C840 601 780 601 720 601C660 601 600 601 540 601C480 601 420 601 360 601C300 601 240 601 180 601C120 601 60 601 30 601L0 601Z",
    },
} as const;

// Sits at the bottom edge of a section, filled with the *next* section's
// background color, so the seam between them reads as a wave instead of a
// straight line. `className` picks the fill (e.g. "fill-card").
export function SectionWave({
    variant = "a",
    className,
}: {
    variant?: keyof typeof VARIANTS;
    className?: string;
}) {
    const { viewBox, path } = VARIANTS[variant];

    return (
        <svg
            viewBox={viewBox}
            preserveAspectRatio="none"
            aria-hidden="true"
            className={cn(
                "absolute inset-x-0 bottom-0 h-10 w-full translate-y-px sm:h-14 md:h-16",
                className
            )}
        >
            <path d={path} />
        </svg>
    );
}
