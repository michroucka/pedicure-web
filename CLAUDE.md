# CLAUDE.md — Pedikúra Web + Booking systém

## Role Claude Code v tomto projektu

**Toto je učební projekt.** Michal se chce naučit stavět fullstack aplikaci
od nuly, ne dostat hotový kód od AI.

- **NEPIŠ kód automaticky.** Chovej se jako zkušený parťák/mentor (pair programming),
  ne jako generátor řešení.
- Vysvětluj koncepty, navrhuj přístupy, ptej se na rozhodnutí, ukazuj na
  dokumentaci nebo příklady — ale implementaci nech na mně.
- Kód piš **jen když o to výslovně požádám** ("napiš mi to", "vygeneruj tenhle
  soubor" apod.). Jinak popisuj *co* a *proč*, ne hotové řešení.
- Když narazím na chybu, nejdřív mi pomoz pochopit *proč* nastala a nasměruj
  mě, než mi rovnou dáš opravu.
- Code review: klidně buď kritický a konkrétní, to pomáhá učení.
- Pokud si nejsem jistý architekturou/rozhodnutím, rozeber mi trade-offy,
  ale finální rozhodnutí nech na mně.

## Kontext projektu

Web + booking aplikace pro rodinného příslušníka (pedikérka), OSVČ, jedna
osoba/poskytovatel služby. Neúčtuje se plná tržní cena — jde primárně o
portfolio/reálný projekt pro rodinu. Doména je koupená.

### Tři části
1. **Marketing web** — info, ceník, kontakt.
2. **Booking aplikace pro klienty** — bez nutnosti registrace.
3. **Admin rozhraní pro pedikérku** — správa dostupnosti, rezervací, klientů.

## Tech stack (rozhodnuto)

- **Next.js 16** (App Router), monorepo — web i appka ve stejném projektu
- **Tailwind CSS + shadcn/ui**
- **PostgreSQL + Prisma** ORM (DB: Neon, free tier)
- **Auth.js (NextAuth)** — jen pro admina (pedikérku); JWT session, credentials
  provider proti `AdminUser`, heslo hashované přes **argon2**, vše v jednom
  `auth.ts` (Node runtime). `jwt` callback revaliduje session proti DB při
  každém requestu (ne jen podle platnosti podpisu) — smazaný účet nebo
  změna username/emailu/hesla session okamžitě zneplatní
- **Ochrana admin sekce** je v `proxy.ts`, ne (jen) v layoutu — zkoušeli jsme
  nejdřív kontrolu v `app/(admin)/(dashboard)/layout.tsx` (server-side
  session check + `redirect`), protože Next.js middleware/proxy doporučuje
  jen když není jiná možnost. Ukázalo se ale, že Next.js cachuje shared
  layout napříč klientskou navigací (klik mezi `/kalendar`/`/dostupnost`/
  `/klienti` layout znovu nespustí, jen page segment), takže kontrola
  v layoutu zachytí zneplatněnou session až při tvrdém reloadu. `proxy.ts`
  běží na každý request včetně soft navigace, takže tuhle mezeru nemá —
  to je ten "není jiná možnost" případ. Next.js 16 navíc `proxy.ts` vždy
  spouští na Node.js runtime (ne Edge), takže tam jde volat plné `auth()`
  s Prisma bez potřeby edge-safe configu
- **Admin na vlastní subdoméně** (`admin.pedikurakralovice.cz`) — admin routy
  (`/kalendar`, `/dostupnost`, `/klienti`, `/login`) nemají žádný společný
  URL prefix, takže dávají smysl jen na téhle subdoméně. `proxy.ts` podle
  hlavičky `Host` přesměruje admin cesty pryč z hlavní domény na
  `admin.pedikurakralovice.cz`, a na admin subdoméně přesměruje `/` na
  `/kalendar`
- **Resend** — transakční emaily z vlastní domény (SPF/DKIM/DMARC DNS záznamy)
- **Hosting: Vercel** (Hobby/free plan stačí; zvážit Pro $20/měs jen pokud
  bude potřeba častější cron)

## Kalendářní integrace (Apple Calendar)

- **Žádný CalDAV.** Jen jednosměrný **ICS feed subscription**
  (`/api/calendar/[token].ics`), Apple Calendar si ho sám pravidelně stahuje
  (read-only, žádný auth).
- Zdroj pravdy = DB. Apple Calendar je jen pohodlný náhled pro mobil.
- Token = dlouhý random string v URL.
- Knihovna na generování ICS: `ics` (npm).
- Pedikérce ukázat nastavení auto-refresh (Get Info → Auto-refresh, cca 15 min).

## Push notifikace

- **PWA + Web Push API**, ne nativní appka.
- iOS 16.4+ funguje jen po přidání appky na plochu (Add to Home Screen).
- Skutečný push (APNs/FCM), doručení řádově vteřiny, appka nemusí být otevřená.
- Potřeba: Service Worker + Web Push subscription + server endpoint.
- Pedikérku jednorázově zaškolit (přidání na plochu, povolení notifikací).

## Datový model

**Service**
- id, name, durationMinutes (30/45/60), price, active, description

**Client**
- id, name, phone, email, extraTimeMinutes (default 0 — checkbox v adminu
  "tomuto klientovi to trvá déle", přičítá se ke každé service při výpočtu
  volných slotů pro tohoto klienta), note, createdAt
- `email` je v DB nepovinné (telefonické/osobní rezervace zadané
  pedikérkou nemusí email řešit) — ale online booking formulář ho
  vyžaduje jako povinný, protože na něm stojí potvrzovací email, magic
  link i připomínka

**RecurringAvailability**
- id, dayOfWeek, startTime, endTime
- (bez breaku mezi rezervacemi — sloty na sebe navazují přímo)
- Jeden den může mít víc řádků/bloků (např. 9–12 a 14–17 s obědovou
  pauzou) — admin obrazovka Dostupnost umožňuje k jednomu dni přidat
  víc časových bloků, ne jen jeden souvislý interval

**AvailabilityException**
- id, date, type (`blocked` / `extra_open`), startTime, endTime (nullable)

**Booking**
- id, clientId, serviceId, date, startTime, endTime
- status (`confirmed` / `cancelled`)
- groupId (nullable, UUID) — provázané rezervace při objednání více osob
  najednou (2+), musí jít navazující sloty za sebou
- source (`online` / `phone` / `in_person` — rezervace na příště domluvená
  přímo při návštěvě)
- cancelToken (magic link)
- reminderRequested (bool, default false — checkbox "poslat připomínku"
  při vytváření rezervace; u skupinové rezervace jeden sdílený checkbox
  za celou skupinu, ne per-osoba)
- reminderSent (bool)
- createdAt
- Efektivní délka slotu = `service.durationMinutes + client.extraTimeMinutes`

**AdminUser**
- id, username, email, passwordHash
- (samostatná tabulka i pro 1 uživatele — standardní pattern pro Auth.js,
  bezpečné hashované heslo v DB, ne v .env; snadné rozšíření do budoucna)

## Business logika (rozhodnuto)

- **FCFS, auto-confirm** — žádné schvalování rezervací pedikérkou
- **Race condition při vytváření** — DB transakce nebo unique constraint na
  (date, startTime), insert selže při kolizi → klient dostane chybu a musí
  vybrat jiný slot. Ne aplikační mutex (Vercel = více instancí, nepomůže).
- **Push pedikérce** při každé nové rezervaci
- **Ranní cron** (Vercel Cron, denně) — push s rozpisem dne (časy od-do) +
  proklik do kalendáře dne; email verze s plným rozpisem včetně jmen klientů
- **Email klientovi** — potvrzení rezervace s magic linkem (zrušení/přesun)
- **Připomínkový email** klientovi ráno v den rezervace (cron, volitelné —
  checkbox `reminderRequested` při vytváření rezervace)
- **Zrušení/přesun přes magic link** — max do 24h před termínem (server-side
  kontrola, konstanta v kódu, ne DB pole). Tohle omezení platí jen pro
  klienta přes magic link — admin (pedikérka) může rezervaci
  zrušit/přesunout z admin rozhraní kdykoliv, bez 24h limitu
  - Přesun = zrušit starý Booking + založit nový (ne editace in-place).
    Implementováno zatím pro admin (`lib/move-booking.ts` —
    `moveBooking` pro sólo, `moveGroupBooking` pro celou skupinu
    najednou se zachováním `groupId`); magic-link verze pro klienta
    zatím není postavená (další krok v plánu)
- **Skupinové rezervace** (matka+dcera apod.) — 2+ osob, navazující sloty,
  různé služby možné, `groupId` na Booking, každá osoba samostatný záznam.
  Kontaktní údaje (telefon, email) jsou jen jedny sdílené za celou
  skupinu (jeden "hlavní kontakt"), ne per-osobu — jen jméno se liší
- **No-show tracking** — netřeba, needed

## Admin UX — DŮLEŽITÉ

- **Mobile/tablet first.** Pedikérka bude admin používat hlavně na tabletu
  na šířku (trvale v provozovně) + mobilu. PC jen výjimečně (nastavování
  rozvrhu).
- Nastavení dostupnosti (RecurringAvailability) musí být **co nejjednodušší
  a nejrychlejší** — jinak appka ztrácí smysl. Tohle je kritická část UX.
- Přehled rezervací + rychlé akce (zrušit, ruční přidat) → optimalizovat
  pro touch (velké tap targets, ne husté tabulky).

## Marketing web — struktura stránek

- **Homepage** — základní info + fotky
- **Ceník** — služby (30/45/60 min varianty) + produkty na prodej (krémy
  apod., statický výpis, ne eshop)
- **Kontakt** — kontaktní formulář + adresa
- CTA proklik do booking appky z homepage a ceníku

## Styl práce

- Preferuji stručná vysvětlení, detail jen na vyžádání.
- Komunikace v češtině.
- Chci rozumět každé části architektury, ne jen "ať to funguje".
