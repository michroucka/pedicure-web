<!-- dokumenty-souhrn: format 1, vygenerováno 2026-11-07 -->

# Nohy v cajku – podklady pro dokumenty

## Účel a rozsah díla

- Web a rezervační systém pedikúry „Nohy v cajku“ v Kralovicích (lib/business-info.ts)
- Provozovatel: RSDr. Miroslav Roučka, IČO 13866435, Boženy Němcové 204, 331 41 Kralovice, fyzická osoba zapsaná v živnostenském rejstříku (lib/business-info.ts)
- Pedikérka (poskytovatelka služby): Kateřina Roučková, jedna osoba (lib/business-info.ts, CLAUDE.md)
- Tři části: marketingový web, online rezervace pro klienty bez registrace, administrace pro pedikérku (CLAUDE.md, README.md)
- Online rezervace zapnuté od 2026-10-23 (lib/booking-enabled.ts, docs/TODO-pravni-a-provoz.md)

## Stránky a funkce

- Marketing: úvodní stránka (`/`), ceník (`/cenik`), kontakt (`/kontakt`), zásady ochrany osobních údajů (`/ochrana-osobnich-udaju`) (app/(marketing)/)
- Kontakt: telefon, e-mail, adresa, mapa Mapy.com načítaná až po kliknutí, odkaz na Google recenzi, údaje provozovatele (CLAUDE.md, components/marketing/map-embed.tsx, docs/TODO-pravni-a-provoz.md)
- Rezervace (`/rezervace`): výběr služby, dne a času, sólo nebo skupinová rezervace 2–4 osob (app/rezervace/, app/rezervace/schema.ts)
- Rezervační formulář sbírá jméno (u skupiny jména všech osob), telefon a e-mail; nad odesláním informační věta s odkazem na zásady, bez checkboxu (app/rezervace/schema.ts, components/rezervace/privacy-notice.tsx)
- Ochrana formuláře: Cloudflare Turnstile a limit max. 3 nadcházejících online rezervací na telefon/e-mail (lib/turnstile.ts, lib/online-booking-limit.ts; Turnstile v produkci zapnutý dle Michala)
- Správa rezervace přes magic link (`/rezervace/sprava/[token]`): zrušení a přesun nejpozději 24 h před termínem (app/rezervace/sprava/[token]/, lib/booking-modification-window.ts)
- Potvrzovací e-mail a e-mail o přesunu rezervace (lib/send-booking-confirmation-email.ts, emails/)
- Ranní připomínková SMS klientovi v den rezervace (app/api/cron/morning-reminders/route.ts, lib/sms.ts)
- Administrace na `admin.pedikurakralovice.cz`: přihlášení (`/login`), kalendář (`/kalendar`), dostupnost (`/dostupnost`), klienti (`/klienti`), nastavení (`/nastaveni`) (app/(admin)/, CLAUDE.md)
- Administrace: ruční přidání, zrušení a přesun rezervací, správa klientů (skrytí/smazání), QR platba (components/admin/, app/(admin)/(dashboard)/klienti/actions.ts, components/admin/qr-payment.tsx)
- Push notifikace pedikérce (PWA) při nové online rezervaci, denní souhrn, upozornění na nízký kredit SMS (lib/send-push.ts, public/sw.js, app/api/cron/morning-reminders/route.ts)
- ICS kalendářní feed pro Apple Calendar (`/api/calendar/[token]`) (app/api/calendar/[token]/route.ts)
- Cron úlohy: ranní připomínky denně v 7:00 UTC, mazání starých dat 1. den v měsíci (vercel.json)
- SEO: robots.txt, sitemap, strukturovaná data LocalBusiness (app/robots.ts, app/sitemap.ts, app/(marketing)/layout.tsx)

## Doména a hosting

- Doména `pedikurakralovice.cz`, kanonická `www.pedikurakralovice.cz`, apex přesměrován na www (CLAUDE.md, lib/business-info.ts)
- Držitel domény: provozovatel (Miroslav Roučka), registrátor WEDOS, expirace 13. 8. 2027 (docs/TODO-pravni-a-provoz.md)
- Doménu platí provozovatel (dle Michala)
- DNS u WEDOSu (docs/TODO-pravni-a-provoz.md)
- Hosting: Vercel Pro na účtu vývojáře, region funkcí `fra1` (Frankfurt) (CLAUDE.md, docs/TODO-pravni-a-provoz.md)
- Vercel Pro platí zhotovitel (docs/TODO-pravni-a-provoz.md)
- Schránky: Seznam Email Profi (`rouckova@`, alias `info@`, `rezervace@`), bezplatný tarif (docs/TODO-pravni-a-provoz.md, lib/business-info.ts; tarif dle Michala)
- Transakční e-maily z `rezervace@pedikurakralovice.cz` přes Resend, SPF/DKIM/DMARC nastaveno (lib/business-info.ts, docs/TODO-pravni-a-provoz.md)

## Technologie

- Next.js 16 (App Router), React 19, TypeScript (package.json)
- Tailwind CSS 4, shadcn/ui, Radix UI (package.json)
- PostgreSQL na Neon (region `aws-eu-central-1`, Frankfurt), Prisma ORM 7 (package.json, docs/TODO-pravni-a-provoz.md)
- Auth.js (NextAuth v5) s hesly hashovanými přes argon2, jen pro admina (package.json, CLAUDE.md)
- E-maily: Resend + React Email (package.json)
- Web Push (`web-push`), PWA (package.json, public/manifest.webmanifest, public/sw.js)
- Bez CMS, obsah přímo v kódu (app/(marketing)/, lib/business-info.ts)
- Proměnné prostředí: `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `AUTH_SECRET`, `NEXT_PUBLIC_BANK_PREFIX`, `NEXT_PUBLIC_BANK_ACCOUNT`, `NEXT_PUBLIC_BANK_CODE`, `RESEND_API_KEY`, `SMSMANAGER_API_KEY`, `CRON_SECRET`, `ICS_FEED_TOKEN`, `ALERT_EMAIL_TO`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `VAPID_PRIVATE_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_SUBJECT` (.env.example)

## Služby třetích stran

- Vercel – hosting, cron, firewall (rate limit přihlášení), Web Analytics, Speed Insights – placená (Pro, platí zhotovitel) (docs/TODO-pravni-a-provoz.md, CLAUDE.md, app/(marketing)/layout.tsx, app/rezervace/layout.tsx)
- Neon – databáze PostgreSQL – zdarma (free tarif) (docs/TODO-pravni-a-provoz.md)
- GitHub – zdrojový kód a noční šifrované zálohy databáze (soukromé repo `pedicure-db-backup`, uchování 30 dní) (docs/TODO-pravni-a-provoz.md, lib/data-retention.ts)
- Resend – transakční e-maily – zdarma (free tarif) (docs/TODO-pravni-a-provoz.md)
- SMSManager.cz – připomínkové SMS – placená (kredit platí provozovatel, účet na vývojáři, doklady na IČO provozovatele) (docs/TODO-pravni-a-provoz.md, lib/sms.ts)
- Cloudflare Turnstile – ochrana rezervačního formuláře proti botům – zdarma (lib/turnstile.ts; v produkci a cena dle Michala)
- Mapy.com (Seznam) – mapa na stránce Kontakt, načítaná po kliknutí – zdarma (components/marketing/map-embed.tsx; cena dle Michala)
- Paylibo – generování QR platby v administraci – zdarma (components/admin/qr-payment.tsx; cena dle Michala)
- Push služby prohlížečů (Apple/Google) – doručení push notifikací pedikérce (CLAUDE.md)
- Seznam Email Profi – e-mailové schránky – zdarma (docs/TODO-pravni-a-provoz.md; tarif dle Michala)
- WEDOS – registrátor domény a DNS (docs/TODO-pravni-a-provoz.md)

## Osobní údaje

- Správce: provozovatel; kontakt pro žádosti `info@pedikurakralovice.cz` (app/(marketing)/ochrana-osobnich-udaju/page.tsx, lib/business-info.ts)
- Klienti: jméno, telefon, e-mail, termín a služba, u skupinové rezervace jména dalších osob (app/(marketing)/ochrana-osobnich-udaju/page.tsx, app/rezervace/schema.ts)
- Sběr: online rezervační formulář; rezervace zadané pedikérkou v administraci (telefonické a osobní) (CLAUDE.md, app/(marketing)/ochrana-osobnich-udaju/page.tsx)
- Interní poznámka u klienta v administraci, s upozorněním nezapisovat zdravotní údaje; zdravotní údaje se nesbírají (components/admin/note-health-hint.tsx, app/(marketing)/ochrana-osobnich-udaju/page.tsx)
- Uložení: databáze Neon v EU (Frankfurt), zálohy v soukromém GitHub repu, uchování záloh 30 dní (docs/TODO-pravni-a-provoz.md, lib/data-retention.ts)
- Doba uchování: 3 roky od poslední návštěvy, automatické mazání cronem 1. den v měsíci (lib/data-retention.ts, app/api/cron/data-retention/route.ts, vercel.json)
- Právní základ: plnění smlouvy (rezervace), oprávněný zájem (evidence klientů, provoz a zabezpečení webu) (app/(marketing)/ochrana-osobnich-udaju/page.tsx)
- Admin: uživatelské jméno, e-mail, hash hesla, push subscriptions zařízení (prisma/schema.prisma)
- Zpracovatelé: Vercel, Neon, GitHub, Resend, SMSManager (docs/TODO-pravni-a-provoz.md)
- Předání do třetí země: někteří poskytovatelé sídlí v USA, předání na základě EU-US Data Privacy Framework nebo standardních smluvních doložek (app/(marketing)/ochrana-osobnich-udaju/page.tsx)
- Cookies: na veřejném webu žádné; Auth.js cookies a localStorage (`keep-awake`) jen v administraci, technicky nezbytné (docs/TODO-pravni-a-provoz.md, lib/keep-awake.ts)
- Mapa Mapy.com se načte až po kliknutí, poté může ukládat vlastní cookies (components/marketing/map-embed.tsx, app/(marketing)/ochrana-osobnich-udaju/page.tsx)
- Analytika: Vercel Web Analytics a Speed Insights na marketingovém webu a v rezervacích (ne v administraci), bez cookies, v produkci zapnuté (app/(marketing)/layout.tsx, app/rezervace/layout.tsx, app/(marketing)/ochrana-osobnich-udaju/page.tsx; zapnutí dle Michala)
- Zásady ochrany osobních údajů zveřejněny na `/ochrana-osobnich-udaju`, platné od 23. 10. 2026 (app/(marketing)/ochrana-osobnich-udaju/page.tsx)

## Open source knihovny

- Next.js – MIT (node_modules/next/package.json)
- React, React DOM – MIT (node_modules/react/package.json)
- Prisma, @prisma/client – Apache-2.0 (node_modules/prisma/package.json)
- Auth.js (next-auth) – ISC (node_modules/next-auth/package.json)
- Tailwind CSS – MIT (node_modules/tailwindcss/package.json)
- Radix UI, shadcn – MIT (node_modules/radix-ui/package.json, node_modules/shadcn/package.json)
- lucide-react – ISC (node_modules/lucide-react/package.json)
- date-fns, zod, react-hook-form, react-day-picker, embla-carousel – MIT (node_modules/*/package.json)
- resend, @react-email/components – MIT (node_modules/*/package.json)
- web-push – MPL-2.0 (node_modules/web-push/package.json)
- ics – ISC (node_modules/ics/package.json)
- argon2, pg – MIT (node_modules/*/package.json)
- @vercel/analytics – MIT, @vercel/speed-insights – Apache-2.0 (node_modules/*/package.json)

## Předání

- Admin přístup do `admin.pedikurakralovice.cz` (dle Michala)
- Návod / zaškolení k administraci (dle Michala), včetně přidání PWA na plochu, povolení notifikací a nastavení odběru kalendáře (CLAUDE.md)
- Účty služeb (Vercel, Neon, Resend, SMSManager, GitHub) zůstávají na vývojáři (dle Michala, docs/TODO-pravni-a-provoz.md)
