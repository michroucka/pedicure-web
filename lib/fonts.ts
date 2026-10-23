import { Fraunces } from "next/font/google";

// Display headings exist only on storefront pages (marketing layout and the
// root not-found page, which renders the marketing footer) - applying the
// variable there, not in the root layout, keeps admin and booking pages from
// preloading two font files they never use.
export const fontDisplay = Fraunces({
    subsets: ["latin"],
    style: ["normal", "italic"],
    variable: "--font-display",
});
