export const OPERATOR_INFO = {
    name: "RSDr. Miroslav Roučka",
    address: "Boženy Němcové 204, 331 41 Kralovice",
    ico: "13866435",
    registryNote: "Fyzická osoba zapsaná v živnostenském rejstříku",
} as const;

export const BUSINESS_INFO = {
    name: "Nohy v cajku",
    // Vercel 308-redirects the bare apex to www, so every absolute URL
    // (metadataBase, sitemap, JSON-LD, links in e-mails) must use www.
    siteUrl: "https://www.pedikurakralovice.cz",
    tagline: "Pedikúra Kralovice",
    practitioner: "Kateřina Roučková",
    phone: "+420739665010",
    phoneDisplay: "+420 739 665 010",
    email: "rouckova@pedikurakralovice.cz",
    // Alias forwarding to the same mailbox as `email`.
    privacyEmail: "info@pedikurakralovice.cz",
    address: {
        street: "Boženy Němcové 204",
        postalCode: "331 41",
        city: "Kralovice",
    },
    geo: { latitude: 49.9803738889, longitude: 13.4847511111 },
    // Same firm as the Firmy.cz listing, shown in the mapy.com widget.
    mapyFirmId: 14057489,
} as const;

export const EMAIL_FROM = `${BUSINESS_INFO.tagline} <rezervace@pedikurakralovice.cz>`;
