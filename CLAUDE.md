# CLAUDE.md – Pedikúra Web + Booking systém

## Role Claude Code v tomto projektu

**Toto je učební projekt.** Michal se chce naučit stavět fullstack aplikaci
od nuly, ne dostat hotový kód od AI.

- **NEPIŠ kód automaticky.** Chovej se jako zkušený parťák/mentor (pair programming),
  ne jako generátor řešení.
- Vysvětluj koncepty, navrhuj přístupy, ptej se na rozhodnutí, ukazuj na
  dokumentaci nebo příklady – ale implementaci nech na mně.
- Kód piš **jen když o to výslovně požádám** ("napiš mi to", "vygeneruj tenhle
  soubor" apod.). Jinak popisuj *co* a *proč*, ne hotové řešení.
- Když narazím na chybu, nejdřív mi pomoz pochopit *proč* nastala a nasměruj
  mě, než mi rovnou dáš opravu.
- Code review: klidně buď kritický a konkrétní, to pomáhá učení.
- Pokud si nejsem jistý architekturou/rozhodnutím, rozeber mi trade-offy,
  ale finální rozhodnutí nech na mně.

## Kontext projektu

Web + booking aplikace pro rodinného příslušníka (pedikérka), OSVČ, jedna
osoba/poskytovatel služby. Neúčtuje se plná tržní cena – jde primárně o
portfolio/reálný projekt pro rodinu. Doména je koupená.

### Tři části
1. **Marketing web** – info, ceník, kontakt.
2. **Booking aplikace pro klienty** – bez nutnosti registrace.
3. **Admin rozhraní pro pedikérku** – správa dostupnosti, rezervací, klientů.

## Tech stack (rozhodnuto)

- **Next.js 16** (App Router), monorepo – web i appka ve stejném projektu
- **Tailwind CSS + shadcn/ui**
- **PostgreSQL + Prisma** ORM (DB: Neon, free tier)
- **Auth.js (NextAuth)** – jen pro admina (pedikérku); JWT session, credentials
  provider proti `AdminUser`, heslo hashované přes **argon2**, vše v jednom
  `auth.ts` (Node runtime). `jwt` callback revaliduje session proti DB při
  každém requestu (ne jen podle platnosti podpisu) – smazaný účet nebo
  změna username/emailu/hesla session okamžitě zneplatní
- **Ochrana admin sekce** je v `proxy.ts`, ne (jen) v layoutu – zkoušeli jsme
  nejdřív kontrolu v `app/(admin)/(dashboard)/layout.tsx` (server-side
  session check + `redirect`), protože Next.js middleware/proxy doporučuje
  jen když není jiná možnost. Ukázalo se ale, že Next.js cachuje shared
  layout napříč klientskou navigací (klik mezi `/kalendar`/`/dostupnost`/
  `/klienti` layout znovu nespustí, jen page segment), takže kontrola
  v layoutu zachytí zneplatněnou session až při tvrdém reloadu. `proxy.ts`
  běží na každý request včetně soft navigace, takže tuhle mezeru nemá –
  to je ten "není jiná možnost" případ. Next.js 16 navíc `proxy.ts` vždy
  spouští na Node.js runtime (ne Edge), takže tam jde volat plné `auth()`
  s Prisma bez potřeby edge-safe configu
- **Admin na vlastní subdoméně** (`admin.pedikurakralovice.cz`) – admin routy
  (`/kalendar`, `/dostupnost`, `/klienti`, `/login`) nemají žádný společný
  URL prefix, takže dávají smysl jen na téhle subdoméně. `proxy.ts` podle
  hlavičky `Host` přesměruje admin cesty pryč z hlavní domény na
  `admin.pedikurakralovice.cz`, a na admin subdoméně přesměruje `/` na
  `/kalendar`
- **`pedikurakralovice.cz` (apex bez www) 308 přesměrovává na
  `www.pedikurakralovice.cz`** – nastaveno na úrovni Vercel domény, ne
  v `proxy.ts`/aplikačním kódu. `www.` je tedy skutečná kanonická doména –
  všechny absolutní URL v SEO kódu (`metadataBase`, `app/sitemap.ts`,
  `Sitemap:` řádek v `app/robots.ts`, LocalBusiness JSON-LD) musí mířit na
  `www.`, jinak vyhledávače narazí na redirect místo stránky
- **Booking jde vypnout** přes `lib/booking-enabled.ts`
  (`BOOKING_ENABLED`, od 2026-10-23 `true`). Při `false` `proxy.ts`
  přesměruje `/rezervace` na `/` a všechna CTA "Objednat se" (hero,
  closing section, nav, ceník, kontakt) jsou podmíněně skrytá – flag
  přepíná obojí najednou, nepřidávat CTA/gate ručně po jednom
- **Resend** – transakční emaily z vlastní domény (SPF/DKIM/DMARC DNS záznamy)
- **Hosting: Vercel Pro** na účtu vývojáře (Hobby nesmí komerčně), region
  funkcí `fra1` kvůli Neonu. Weby jiných zákazníků na tenhle účet ne
  (podmínky Vercelu zakazují přeprodej) – viz bod 8 v
  `docs/TODO-pravni-a-provoz.md`
- **CI: GitHub Actions** (`.github/workflows/ci.yml`) – na každý PR
  typecheck, lint, `prettier --check`, testy a `next build`. Testy běží
  proti Neon test branchi přes GitHub secrets `TEST_DATABASE_URL`
  a `TEST_DATABASE_URL_UNPOOLED`; nový push zruší starší běh téže větve,
  běhy různých PR se můžou na test branchi potkat (pak spustit znovu)

## Kalendářní integrace (Apple Calendar)

- **Žádný CalDAV.** Jen jednosměrný **ICS feed subscription**
  (`/api/calendar/[token].ics`), Apple Calendar si ho sám pravidelně stahuje
  (read-only, žádný auth).
- Zdroj pravdy = DB. Apple Calendar je jen pohodlný náhled pro mobil.
- Token = dlouhý random string v URL.
- Knihovna na generování ICS: `ics` (npm).
- Pedikérce ukázat nastavení auto-refresh (Get Info → Auto-refresh, cca 15 min).

## Push notifikace

- **Hotovo.** PWA + Web Push API, ne nativní appka.
- iOS 16.4+ funguje jen po přidání appky na plochu (Add to Home Screen) –
  `PushSubscribeFlow` (`components/admin/push-subscribe-flow.tsx`, v admin
  `/nastaveni`) to detekuje přes `matchMedia("(display-mode: standalone)")`
  a mimo standalone mód přepínač zablokuje s instrukcí místo tichého selhání.
- Skutečný push (APNs/FCM), doručení řádově vteřiny, appka nemusí být otevřená.
- VAPID klíče v env – `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (klient ho potřebuje
  při `pushManager.subscribe()`), `VAPID_PRIVATE_KEY`/`VAPID_SUBJECT` jen
  server-side.
- `lib/send-push.ts` (`sendPushNotification()`) – posílá na všechny
  subscriptions najednou přes `Promise.allSettled` (jedna mrtvá subscription
  nezastaví ostatní), na 404/410 od push služby (subscription už neexistuje)
  smaže záznam z DB, jiné chyby jen loguje.
- `public/sw.js` – `push` handler zobrazí notifikaci, `notificationclick`
  nejdřív zkusí zaostřit už otevřené okno appky (`clients.matchAll` +
  `focus()`), teprve pak otevře nové (`clients.openWindow`) – appka běží
  trvale na tabletu v provozovně, duplicitní okno by bylo matoucí.
- Spouští se ze dvou míst: (1) `app/rezervace/actions.ts` při nové online
  rezervaci, přes Next.js `after()` aby se neprodlužoval redirect klientovi
  čekáním na odeslání pushe; (2) ranní cron
  (`app/api/cron/morning-reminders/route.ts`) – denní souhrn a push k
  low-credit SMS alertu (viz Business logika níže).
- Pedikérku jednorázově zaškolit (přidání na plochu, povolení notifikací).

## Datový model

**Service**
- id, name, durationMinutes (30/45/60), price, active, description

**Client**
- id, name, phone, email, extraTimeMinutes (default 0 – checkbox v adminu
  "tomuto klientovi to trvá déle"; výchozí hodnota, ze které se
  předvyplní extra čas nové rezervace – samotný výpočet délky už bere
  snapshot z `Booking.extraTimeMinutes`), note, createdAt
- Extra čas (u klienta i u bookingu) je vždy násobek 5 min –
  `normalizeExtraMinutes` v `lib/extra-time.ts`, server zaokrouhluje
  každou hodnotu z formuláře, pole v UI se zarovná při opuštění
- `active` (default true) – „Smazat“ klienta v adminu (`deleteClientAction`):
  klient bez jediné rezervace se smaže úplně, klient s rezervacemi
  (i zrušenými – historie) dostane jen `active: false` a zmizí ze
  seznamu Klienti a z našeptávače jmen. Ruční obnovení není – skrytý
  klient se znovu aktivuje sám, když si přes `findOrCreateClient`
  vytvoří novou rezervaci (párování skryté klienty záměrně zahrnuje,
  jinak by vznikaly duplicity)
- Párování klienta (`lib/find-client.ts`, používá ho `findOrCreateClient`
  i náhled extra času v booking formuláři): podle telefonu, a jen když
  telefon chybí, podle přesné shody jména. Telefon se páruje přes
  indexovaný sloupec `Client.phoneNormalized` – generated column, počítá
  ho Postgres sám z `phone` (stejné pravidlo jako `normalizePhoneForMatch`,
  shodu hlídá `lib/client-phone-normalized.test.ts`). Nikdy do něj
  nezapisovat
- Náhled extra času ve veřejném formuláři (`getExtraMinutesAction`) je
  přísnější než odeslání: odpoví jen při shodě telefonu **i** jména (bez
  ohledu na velikost písmen/diakritiku), aby samotné číslo neprozradilo, že
  je někdo klient. Odeslání páruje jen podle telefonu – při jinak napsaném
  jménu se delší slot projeví až po odeslání (redirect na výběr slotu)
- Telefon = identita, ostatní údaje bere **poslední zadaná hodnota**
  (jméno, e-mail – online i v adminu). Klient se ale zapisuje až po
  ověření slotu, neúspěšná rezervace nic nepřepíše (výjimka: když slot
  odmítne až DB constraint kvůli souběhu dvou odeslání, klient už je
  zapsaný – vzácné, vědomě neřešeno). Vědomě přijaté riziko:
  kdo zná cizí telefon, může online přepsat jméno/e-mail klienta a
  dostávat jeho budoucí e-maily (magic link po přesunu). Zvažovaná
  alternativa (jiné jméno do `guestName`, e-mail neměnit) zavrhnuta jako
  zbytečně složitá vzhledem k reálnému riziku
- `email` je v DB nepovinné (telefonické/osobní rezervace zadané
  pedikérkou nemusí email řešit) – ale online booking formulář ho
  vyžaduje jako povinný, protože na něm stojí potvrzovací email i magic
  link (ranní připomínka jde přes SMS na `phone`, ten je povinný vždy,
  bez ohledu na `source`)

**RecurringAvailability**
- id, dayOfWeek, startTime, endTime
- (bez breaku mezi rezervacemi – sloty na sebe navazují přímo)
- Jeden den může mít víc řádků/bloků (např. 9–12 a 14–17 s obědovou
  pauzou) – admin obrazovka Dostupnost umožňuje k jednomu dni přidat
  víc časových bloků, ne jen jeden souvislý interval

**AvailabilityException**
- id, date, type (`blocked` / `extra_open`), startTime, endTime (nullable)

**Booking**
- id, clientId, guestName (nullable), serviceId, date, startTime, endTime,
  extraTimeMinutes (default 0)
- status (`confirmed` / `cancelled`)
- groupId (nullable, UUID) – provázané rezervace při objednání více osob
  najednou (2+), musí jít navazující sloty za sebou
- source (`online` / `phone` / `in_person` – rezervace na příště domluvená
  přímo při návštěvě)
- cancelToken (magic link)
- reminderSent (bool)
- createdAt
- Efektivní délka slotu = `service.durationMinutes + booking.extraTimeMinutes`
- `extraTimeMinutes` je snapshot z okamžiku vytvoření – přesun ho přenáší
  dál a nezávisí na pozdější změně `Client.extraTimeMinutes` ani
  `Service.durationMinutes`. Online ho dostane jen hlavní kontakt (z jeho
  klienta), hosté 0; v adminu se zadává u každé osoby zvlášť (u hlavního
  kontaktu se při vytvoření zapíše i zpět do `Client.extraTimeMinutes`)
- `guestName` – jméno člena skupiny, který není hlavní kontakt (viz
  Skupinové rezervace); `null` = jméno se bere z klienta. Zobrazované
  jméno osoby vždy přes `getBookingPersonName` (`guestName ?? client.name`),
  ne přímo `client.name`

**AdminUser**
- id, username, email, passwordHash
- (samostatná tabulka i pro 1 uživatele – standardní pattern pro Auth.js,
  bezpečné hashované heslo v DB, ne v .env; snadné rozšíření do budoucna)

**PushSubscription**
- id, adminUserId (FK na AdminUser), endpoint, p256dh, auth, userAgent
  (nullable), createdAt
- Jeden AdminUser může mít víc řádků (víc zařízení – tablet + mobil
  najednou), `endpoint` je unique (opětovný subscribe ze stejného zařízení
  se upsertne, ne duplikuje)

## Business logika (rozhodnuto)

- **FCFS, auto-confirm** – žádné schvalování rezervací pedikérkou
- **Race condition při vytváření** – řeší DB: exclusion constraint
  `Booking_no_overlap` (btree_gist, žádné dvě CONFIRMED rezervace se
  stejným datem a překrývajícím se `[startTime, endTime)` – pokrývá
  i shodný začátek, dřívější partial unique index byl proto zrušen). Insert selže → `isBookingSlotConflict`
  (`lib/booking-conflict-error.ts`) → klient dostane chybu a musí vybrat
  jiný slot. Constraint Prisma nezná, je jen v migraci. Ne aplikační mutex
  (Vercel = více instancí, nepomůže).
- **Ochrana veřejného formuláře** – Cloudflare Turnstile
  (`lib/turnstile.ts`, `useTurnstile`, vypnutý bez
  `NEXT_PUBLIC_TURNSTILE_SITE_KEY`) + max. 3 nadcházející online rezervace
  na telefon/e-mail (`lib/online-booking-limit.ts`). Online horizont
  (`HORIZON_DAYS`) se vynucuje i na serveru, admina neomezuje
- **Ochrana admin loginu** – rate limit ve **Vercel Firewall** (dashboard,
  ne v repu): POST na `/login` i `/api/auth/callback/credentials` (endpoint
  Auth.js jde volat přímo, mimo stránku), limit podle IP. Ne počítadlo
  v DB – to by útočník zneužil k zamknutí přihlášení pedikérky. Neexistující
  username se ověřuje proti dummy hashi (`auth.ts`), aby doba odpovědi
  neprozradila, který existuje
- **Bezpečnostní hlavičky** v `next.config.ts` – CSP s whitelistem domén
  (nový externí skript/iframe/obrázek = přidat jeho origin, jinak ho
  prohlížeč tiše zablokuje), `frame-ancestors 'none'`. Bez nonce, aby
  marketing zůstal staticky generovaný
- **Push pedikérce** při každé nové rezervaci se `source: "online"` (ne
  pro telefonické/osobní rezervace zadané pedikérkou ručně – ty už zná)
- **Ranní cron** (Vercel Cron, denně) – push pedikérce s denním souhrnem
  (počet klientů + čas od-do, nebo "dnes máš volno") s prokliknutím do
  kalendáře, plus push (spolu s emailem) při nízkém kreditu SMS brány.
  Samostatná emailová verze s plným rozpisem dne (jména klientů) se nakonec
  nestavěla – denní souhrn přes push vyšel jako dostatečný
- **Email klientovi** – potvrzení rezervace s magic linkem
  (zrušení/přesun); postaveno přes Resend + `@react-email/components`
  (`lib/send-booking-confirmation-email.ts`, `emails/`), voláno jen pro
  `source: "online"` (telefonické/osobní rezervace se domlouvají přímo)
- **Připomínková SMS** klientovi ráno v den rezervace (cron) – jde
  automaticky u každé rezervace bez ohledu na zdroj, žádný opt-in
  checkbox. Přes SMSManager.cz (`lib/sms.ts`, zatím neimplementováno)
- **Zrušení/přesun přes magic link** – max do 24h před termínem, kontrola
  přes `lib/booking-modification-window.ts`
  (`canClientModifyBooking`, konstanta v kódu, ne DB pole). Tohle omezení
  platí jen pro klienta přes magic link – admin (pedikérka) může
  rezervaci zrušit/přesunout z admin rozhraní kdykoliv, bez 24h limitu.
  Klientská stránka je `app/rezervace/sprava/[token]/` – je zároveň
  potvrzením po vytvoření rezervace (`?created=1`), samostatná stránka
  podle ID rezervace není (fungovala by jako druhý, nikdy nevypršující
  magic link)
  (`ManageBooking` komponenta) – pro skupinovou rezervaci token kteréhokoli
  člena spravuje celou skupinu najednou (`cancelGroupBooking`,
  `moveGroupBooking`). Admin skupinu upravuje/přesouvá taky celou, ale
  ruší po jednotlivých osobách (jedna ze skupiny nepřijde)
  - Přesun = zrušit starý Booking + založit nový (ne editace in-place),
    `lib/move-booking.ts` – `moveBooking` pro sólo, `moveGroupBooking`
    pro celou skupinu najednou se zachováním `groupId`. Nový Booking má
    nový `cancelToken` – po přesunu přes magic link je proto potřeba
    klienta přesměrovat na `/rezervace/sprava/{novýToken}?moved=1`
    (stránka pak ukáže hlášku „Rezervace přesunuta“), jinak by mu starý
    odkaz přestal fungovat. Protože odkaz z potvrzovacího e-mailu po
    přesunu neplatí, po každém přesunu online rezervace (přes magic link
    i z adminu) jde klientovi e-mail „Rezervace přesunuta“ s novým odkazem
    (`sendBookingMovedEmail`, varianta `moved` téže šablony)
- **Skupinové rezervace** (matka+dcera apod.) – 2+ osob (max 4),
  navazující sloty, různé služby možné, `groupId` na Booking, každá osoba
  samostatný Booking. Kontaktní údaje (telefon, email) jsou jen jedny
  sdílené za celou skupinu (jeden "hlavní kontakt"), ne per-osobu
  - **Jen hlavní kontakt je `Client`.** Všechny Bookingy skupiny mají jeho
    `clientId`, ostatní osoby mají jméno jen v `Booking.guestName` (žádný
    vlastní Client, žádná historie – nevadí, pedikérka skupiny stejně
    zapisuje příjmením, např. "Beránkovi"). Dřív se pro každou osobu
    volal `findOrCreateClient` se sdíleným telefonem → všichni se
    spárovali na jednoho klienta a ten se přejmenoval na poslední jméno.
    Úprava jména hosta v adminu proto mění `guestName` na bookingu,
    nikdy `client.name`
  - Starší skupiny (před 2026-10) můžou mít u hostů vlastního klienta
    s `guestName: null` – zobrazení i úprava fungují i pro ně, není
    potřeba je migrovat
- **No-show tracking** – netřeba, needed

## Admin UX – DŮLEŽITÉ

- **Mobile/tablet first.** Pedikérka bude admin používat hlavně na tabletu
  na šířku (trvale v provozovně) + mobilu. PC jen výjimečně (nastavování
  rozvrhu).
- Nastavení dostupnosti (RecurringAvailability) musí být **co nejjednodušší
  a nejrychlejší** – jinak appka ztrácí smysl. Tohle je kritická část UX.
- Přehled rezervací + rychlé akce (zrušit, ruční přidat) → optimalizovat
  pro touch (velké tap targets, ne husté tabulky).

## SEO / dohledatelnost

- **`app/robots.ts`** – host-aware (čte `Host` hlavičku): na hlavní doméně
  povolí indexaci (kromě `/api/` a `/rezervace/`) a odkáže na sitemapu; na
  `admin.pedikurakralovice.cz` má `Disallow: /` úplně na všechno.
- **`app/sitemap.ts`** – homepage, `/cenik`, `/kontakt`. Všechny URL musí
  mířit na `www.` (viz apex→www redirect výše).
- **LocalBusiness JSON-LD** (`app/(marketing)/layout.tsx`) – adresa,
  telefon, e-mail, `sameAs` s odkazem na Google Business Profile (Firmy.cz
  se doplní, až profil potvrdí).
- **Google Search Console** – ověřeno jako doménová property (DNS TXT),
  sitemapa nahraná.
- **Seznam Webmaster Tools** – ověřeno přes `<meta name="seznam-wmt">` v
  `app/layout.tsx` (`verification.other`). Sitemapu si Seznam čte
  automaticky z `robots.txt`, nemá samostatné pole pro ruční vložení URL.
- **Odkaz na recenzi** na Kontakt stránce – karta vedoucí na Google
  "napsat recenzi" odkaz (`g.page/r/.../review`), ne obecný odkaz na
  profil (ten otevírá rovnou recenzní dialog, míň kroků = víc dokončených
  recenzí).

## Marketing web – struktura stránek

- **Homepage** – základní info + fotky
- **Ceník** – služby (30/45/60 min varianty) + produkty na prodej (krémy
  apod., statický výpis, ne eshop)
- **Kontakt** – telefon, e-mail, adresa s mapou, odkaz na Google recenzi
  (žádný kontaktní formulář)
- CTA proklik do booking appky z homepage a ceníku

## Styl práce

- Preferuji stručná vysvětlení, detail jen na vyžádání.
- Komunikace v češtině.
- Chci rozumět každé části architektury, ne jen "ať to funguje".
- U UI změn neověřuj sám v prohlížeči (nespouštěj dev server kvůli
  screenshotu) – stačí typecheck/build. Vizuální kontrolu v prohlížeči si
  dělám sám.
