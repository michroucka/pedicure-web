import { Fraunces, Montserrat, Playfair_Display } from "next/font/google";
import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

export const metadata: Metadata = {
    title: {
        default: "Nohy v cajku",
        template: "%s | Nohy v cajku",
    },
    description: "Pedikúra Kralovice – Kateřina Roučková",
};

// viewportFit "cover" lets the page paint under the iOS notch/dynamic
// island and home indicator instead of Safari filling that strip with a
// flat white bar; themeColor is what it fills it with. Defaults to the
// admin app's (near-white) background — the storefront layouts override
// this to their own dark plum.
export const viewport: Viewport = {
    viewportFit: "cover",
    themeColor: "#FDFDFD",
};

const fontSans = Montserrat({ subsets: ["latin"], variable: "--font-sans" });

const fontSerif = Playfair_Display({
    subsets: ["latin"],
    variable: "--font-serif",
});

const fontDisplay = Fraunces({
    subsets: ["latin"],
    style: ["normal", "italic"],
    variable: "--font-display",
});

export default function RootLayout({
    children,
}: Readonly<{
    children: ReactNode;
}>) {
    return (
        <html
            lang="cs"
            className={cn(
                "antialiased",
                fontSerif.variable,
                fontDisplay.variable,
                "font-sans",
                fontSans.variable
            )}
        >
            <body className="bg-background text-foreground">
                <TooltipProvider>
                    <div className="">{children}</div>
                </TooltipProvider>
                <Analytics />
                <SpeedInsights />
            </body>
        </html>
    );
}
