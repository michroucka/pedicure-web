import type { CSSProperties } from "react";

// Position of an element in a staggered animation (.enter, .reveal-item in
// globals.css read it as --i to delay itself).
export function stagger(index: number): CSSProperties {
    return { "--i": index } as CSSProperties;
}
