import { Fraunces, Montserrat, Playfair_Display } from "next/font/google";
import type { Metadata } from "next";

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
            <body>
                <TooltipProvider>
                    <div className="">{children}</div>
                </TooltipProvider>
            </body>
        </html>
    );
}
