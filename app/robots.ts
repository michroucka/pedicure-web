import type { MetadataRoute } from "next";
import { headers } from "next/headers";

const MAIN_HOST = "pedikurakralovice.cz";
// Vercel 308-redirects the bare apex to this host — the sitemap link must
// point straight at it, or crawlers see a redirect instead of a page.
const CANONICAL_HOST = "www.pedikurakralovice.cz";

// robots.txt is one route shared by both hosts (admin.* and the apex
// domain resolve to the same deployment) — branch on the Host header the
// same way proxy.ts does, so the admin subdomain gets a hard "don't index
// any of this" while the marketing site gets a normal, scoped robots.txt.
export default async function robots(): Promise<MetadataRoute.Robots> {
    const host = (await headers()).get("host") ?? "";
    const isMainHost = host === MAIN_HOST || host === `www.${MAIN_HOST}`;

    if (!isMainHost) {
        return {
            rules: { userAgent: "*", disallow: "/" },
        };
    }

    return {
        rules: {
            userAgent: "*",
            allow: "/",
            disallow: ["/api/", "/rezervace/"],
        },
        sitemap: `https://${CANONICAL_HOST}/sitemap.xml`,
    };
}
