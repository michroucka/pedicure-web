import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { RegisterServiceWorker } from "@/components/admin/register-service-worker";

// Sits above both /login and (dashboard) so "Add to Home Screen" behaves
// the same regardless of which admin page was open when it happened –
// the dashboard layout only wraps the protected routes, not /login.
export const metadata: Metadata = {
    // Next's manifest.ts file convention only works at the app root and
    // applies globally (like icon.svg does today) – there's no per-segment
    // override for it the way there is for icon/apple-icon. So the
    // manifest itself is a plain static file in public/, and this field
    // is what actually scopes the <link rel="manifest"> tag to admin
    // pages only: it's set here, not at the root, so marketing/rezervace
    // never reference it.
    manifest: "/manifest.webmanifest",
    appleWebApp: {
        capable: true,
        title: "Nohy v cajku",
        statusBarStyle: "default",
    },
};

// The root viewport paints under the status bar ("cover"). iPadOS 26 then
// blurs a strip far taller than safe-area-inset-top over the installed
// admin app, so padding by the inset left the week header smeared. "auto"
// keeps the web view below the status bar entirely - nothing of ours sits
// under it to blur, and the bar takes the matching near-white themeColor.
export const viewport: Viewport = {
    viewportFit: "auto",
    themeColor: "#FDFDFD",
};

export default function AdminGroupLayout({
    children,
}: {
    children: ReactNode;
}) {
    return (
        <>
            {children}
            <RegisterServiceWorker />
        </>
    );
}
