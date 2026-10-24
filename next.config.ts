import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";
// Preview deployments inject the Vercel Toolbar (comments, feedback) from
// vercel.live. Preview builds run with NODE_ENV=production, so they're told
// apart by VERCEL_ENV, which is set at build time when the headers below
// are baked in. Production never allows it.
const vercelToolbar =
    process.env.VERCEL_ENV === "preview" ? " https://vercel.live" : "";

// Every third-party origin the pages load something from. Adding a new embed
// or script means adding its origin here, or the browser silently blocks it.
const CONTENT_SECURITY_POLICY = [
    "default-src 'self'",
    // 'unsafe-inline': Next.js injects inline scripts (hydration data) and a
    // nonce-based policy would force every page to render dynamically,
    // losing static marketing pages. 'unsafe-eval' only for dev (React
    // Refresh). Cloudflare Turnstile on the booking form; Vercel Analytics
    // loads from its own origin outside production.
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://challenges.cloudflare.com https://va.vercel-scripts.com${vercelToolbar}`,
    `style-src 'self' 'unsafe-inline'${vercelToolbar}`,
    // QR payment image in the admin (api.paylibo.com)
    `img-src 'self' data: blob: https://api.paylibo.com${vercelToolbar}${vercelToolbar && " https://vercel.com"}`,
    `font-src 'self' data:${vercelToolbar}${vercelToolbar && " https://assets.vercel.com"}`,
    `connect-src 'self' https://challenges.cloudflare.com https://va.vercel-scripts.com${vercelToolbar}${vercelToolbar && " wss://ws-us3.pusher.com"}`,
    // Map on the contact page (loaded on click), Turnstile challenge
    `frame-src https://mapy.com https://*.mapy.com https://mapy.cz https://*.mapy.cz https://challenges.cloudflare.com${vercelToolbar}`,
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    // Nobody may embed the site - mainly so the admin can't be clickjacked.
    "frame-ancestors 'none'",
].join("; ");

const SECURITY_HEADERS = [
    { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
    // Older browsers that ignore frame-ancestors.
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    // screen-wake-lock stays allowed: the admin keeps the tablet awake
    // (components/admin/keep-awake.tsx).
    {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    },
];

const nextConfig: NextConfig = {
    async headers() {
        return [{ source: "/:path*", headers: SECURITY_HEADERS }];
    },
};

export default nextConfig;
