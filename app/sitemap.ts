import type { MetadataRoute } from "next";
import { BUSINESS_INFO } from "@/lib/business-info.ts";

// Vercel 308-redirects the bare apex domain to www, so URLs listed here
// must point straight at www – otherwise search engines see a redirect
// instead of a page and refuse to index it (this bit Seznam Webmaster).
const BASE_URL = BUSINESS_INFO.siteUrl;

export default function sitemap(): MetadataRoute.Sitemap {
    return [
        {
            url: BASE_URL,
            lastModified: new Date(),
            changeFrequency: "monthly",
            priority: 1,
        },
        {
            url: `${BASE_URL}/cenik`,
            lastModified: new Date(),
            changeFrequency: "monthly",
            priority: 0.8,
        },
        {
            url: `${BASE_URL}/kontakt`,
            lastModified: new Date(),
            changeFrequency: "yearly",
            priority: 0.6,
        },
        {
            url: `${BASE_URL}/ochrana-osobnich-udaju`,
            lastModified: new Date(),
            changeFrequency: "yearly",
            priority: 0.2,
        },
    ];
}
