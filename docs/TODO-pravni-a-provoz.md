# TODO: právní náležitosti a provoz před spuštěním rezervací

Kontext: web provozuje podnikatel (OSVČ, viz patička na `/kontakt`). Online rezervace
sbírají jméno, telefon a e-mail klientů, takže web musí splňovat GDPR. Smlouvy mezi
vývojářem a provozovatelem jsou v samostatném repu `web-dokumenty` (zakázka `pedikura`).
Vzor zásad je v `../web-dokumenty/sablony/web/zasady-ochrany-osobnich-udaju.md`.

Rezervace jsou zapnuté od 2026-10-23 (`lib/booking-enabled.ts`).

**Stav 2026-10-22:** body 1, 2, 3, 5, 6, 7 hotové, 4 čeká na ověřovací audit. Zbývají body bez kódu.
Práce je na větvi `feat/shared-business-info` (pushnutá na `origin`, ne v `main`).

## Kód

- [x] **1. Stránka Zásady ochrany osobních údajů** – hotovo 2026-10-14
  - `app/(marketing)/ochrana-osobnich-udaju/page.tsx`, v sitemapě. Zdrojový text: `web-dokumenty/zakazky/pedikura/zasady-ochrany-osobnich-udaju.md` (rozhodnutí v komentáři nahoře) – **při změně upravit obojí**.
  - Údaje správce z `lib/business-info.ts` (`OPERATOR_INFO`, `BUSINESS_INFO`), doby uchování z `lib/data-retention.ts` (3 roky od poslední návštěvy, zálohy 30 dní).
  - Příjemci jen jako kategorie (hosting, databáze a zálohy, e-mail, SMS, kalendář), jmenovitý seznam je ve zpracovatelské smlouvě (`zakazka.yaml`). Web Push záměrně ne – obsah je šifrovaný end-to-end.
  - Neosobní tvar („správce“), bez řádku Účetnictví (doklady se vydávají bez jména), kontakt pro žádosti `info@pedikurakralovice.cz` (alias na schránku `rouckova@`).
  - **Při nasazení:** přepsat `EFFECTIVE_DATE` („Platné od“) v `page.tsx` na skutečné datum nasazení.
- [x] **2. Odkazy na zásady** – hotovo 2026-10-14
  - patička webu (`marketing-footer.tsx`), informační věta nad tlačítkem odeslání v obou rezervačních formulářích (`components/rezervace/privacy-notice.tsx`, bez checkboxu), patička potvrzovacího e-mailu.
- [x] **3. Identifikace provozovatele** – hotovo 2026-10-14
  - Plné údaje (jméno, sídlo, IČO, živnostenský rejstřík) na `/kontakt`, odkaz z patičky každé stránky („Provozovatel: …“). Zákon (§ 435 OZ, § 5 zák. 480/2004 Sb.) nevyžaduje údaje na každé stránce, stačí snadný přístup.
- [ ] **4. Cookies – audit** – proveden 2026-10-14, **zbývá ověřit opravu**
  - Výsledek: vlastní doména bez cookies i localStorage (Auth.js cookies jen v adminu, `keep-awake` v localStorage jen v adminu – obojí nezbytné). Cookies `google.com` pocházely z vyhledávání ve stejném okně, ne z webu.
  - Problém: mapa Mapy.com na `/kontakt` ukládala sledovací identifikátory Seznamu (`User-Id`, DOT `instance_id` v localStorage) → teď se načte až po kliknutí (`components/marketing/map-embed.tsx`, klik = souhlas), zmíněno v zásadách.
  - **Zbývá:** na produkci v novém anonymním okně otevřít `/kontakt` (adresu napsat přímo, ne přes Google) a bez kliknutí na mapu ověřit, že v Application → Cookies / Local storage není nic od `mapy.com`/`seznam.cz`. Projít i `/rezervace`.
  - Pokud se někdy přidá Google Analytics, Meta Pixel, YouTube embed apod., je nutná cookie lišta nebo načítání na kliknutí.
- [x] **5. Mazání klienta v administraci** – hotovo (`deleteClientAction` v `klienti/actions.ts` + test): klient bez rezervací se smaže, s rezervacemi se skryje (`active: false`).
  - Pozn.: skrytý klient zůstává v DB kvůli historii – úplně ho odstraní cron z bodu 6.
- [x] **6. Automatický úklid starých dat** – hotovo 2026-10-22: cron `app/api/cron/data-retention/route.ts` (1. den v měsíci, `vercel.json`) smaže klienty i s rezervacemi (ne anonymizace), výběr v `getExpiredClientIds` (`lib/data-retention.ts` + test).
  - Poslední návštěva = nejnovější potvrzená rezervace před dneškem. Klient s potvrzenou rezervací dnes nebo v budoucnu se nemaže. Bez jediné návštěvy se počítá od posledního kontaktu (`createdAt` klienta nebo vytvoření kterékoli rezervace).
  - Týká se i skrytých klientů (`active: false`) z bodu 5.
- [x] **7. Pole `note` u klienta** – hotovo 2026-10-22: pod poznámkou nápověda „Nezapisujte zdravotní údaje.“ (`components/admin/note-health-hint.tsx`) ve všech třech dialozích, které ji upravují (`client-edit-dialog`, `add-booking-dialog`, `booking-detail-dialog`). Poznámku má jen `Client`, `Booking` pole `note` nemá. Zdravotní údaje jsou zvláštní kategorie podle čl. 9 GDPR a vyžadovaly by výslovný souhlas klienta. Online formulář pole na poznámku nemá.

## Provoz a účty (bez kódu)

- [x] **8. Vercel Hobby (free) tarif nesmí být použit komerčně.** Podmínky Vercelu omezují Hobby na osobní a nekomerční užití, web podnikatele je komerční.
  
  **Rozhodnuto 2026-10-23: Vercel Pro** (20 USD/měsíc za člena týmu, ne za projekt) na vlastním účtu vývojáře, pro osobní projekty i pedikúru. Nulová migrace.
  
  - Zvažované alternativy: Netlify Free (tvrdý strop 300 kreditů/měsíc, produkční deploy = 15 kreditů, po vyčerpání se pozastaví všechny weby), Cloudflare Workers (free limit 10 ms CPU na request nestačí na argon2 ani SSR, podpora `proxy.ts` v OpenNext je experimentální), VPS + Coolify (netcup; Hetzner CX/CAX od 2026-09 nedostupné).
  - Podmínky Vercelu (§2, §12(i), §12(iv)) zakazují služby přeprodávat nebo provozovat „for the benefit of a third-party“. Pedikúra na účtu vývojáře je šedá zóna (vědomě přijato, hosting se neúčtuje). Weby budoucích zákazníků **ne** na tomto účtu – buď jejich vlastní Vercel účet, nebo VPS.
  - [x] Přejít na Pro (hotovo 2026-10-23). Platí zhotovitel, polovinu mu soukromě hradí provozovatelka – do smlouvy ani nákladů provozovatele se to nepromítá.
  - [x] Nastavit region funkcí na `fra1` (Settings → Functions) – Neon je ve Frankfurtu, výchozí `iad1` je v USA.
  - [x] V `zakazka.yaml` u Vercelu `plati: "zhotovitel"` místo „bezplatný tarif“, smlouva znovu vygenerována (2026-10-23).

- [x] **9. Neon**:
  
  - ~~ověřit, že produkční projekt je v EU regionu~~ – ověřeno 2026-10-11: `aws-eu-central-1` (Frankfurt). Doplněno do zásad i do `zakazka.yaml` (2026-10-14),
  - ~~zkontrolovat limity free tarifu a délku obnovy dat (PITR)~~ – free tarif: PITR jen 6 h, 1 ruční snapshot, plánované snapshoty ne,
  - ~~zvážit vlastní pravidelnou zálohu~~ – hotovo 2026-10-11: soukromé repo `michroucka/pedicure-db-backup`, noční `pg_dump` šifrovaný AES-256, artefakty GitHub Actions s uchováním 30 dní. Postup obnovy v jeho README.

- [ ] **10. Resend a e-mailová doména** – DNS pro Resend zkontrolováno 2026-10-23
  - Resend: DKIM `resend._domainkey`, SPF + MX na `send.` (Amazon SES `eu-west-1`) v pořádku. Free tarif stačí s rezervou (e-mail jen u online rezervace, přesunu a nízkého kreditu SMS). `rezervace@` je alias na `info@`, `replyTo` není potřeba.
  - [x] Ověřit v Resend dashboardu, že doména je **Verified**.
  - [ ] Ověřit v DPA Resendu právní základ předávání do USA (DPF nebo SCC).
  - [x] (ověřeno 2026-10-23, test e-mail má SPF, DKIM i DMARC PASS) Hlavní doména neměla SPF ani DKIM pro schránky na Seznam Email Profi (DNS je u Wedosu). Přidat TXT `v=spf1 include:spf.seznam.cz ~all` na hlavní doménu a CNAME `szn1`–`szn3._domainkey` → `szn1`–`szn3._domainkey.seznam.cz.`. Ověřit testovacím e-mailem na Gmail (SPF, DKIM i DMARC PASS).
  - [ ] Za pár týdnů po ověření zpřísnit DMARC z `p=none` na `v=DMARC1; p=quarantine; adkim=r; aspf=r;` a zkontrolovat, že rezervační e-mail z Resendu pořád projde.

- [x] **11. SMSManager**: účet je na vývojáře, kredit platí provozovatel. Aby šel kredit provozovateli do účetnictví jako výdaj, musí být **doklad za kredit vystavený na jeho IČO**. Rozhodnuto 2026-10-23: účet zůstává na vývojáři, fakturační údaje jsou nastavené na provozovatele (už hotovo). Převod účtu zvážen a zamítnut.

- [ ] **12. Doména `pedikurakralovice.cz`**: držitel ověřen 2026-10-23 přes whois CZ.NIC – `WEDOS-CCA-759260, Miroslav Roučka` = provozovatel, registrátor WEDOS, expirace **13. 8. 2027**.
  - [x] Odstranit TODO u `domena_drzitel` v `web-dokumenty/zakazky/pedikura/zakazka.yaml`.
  - [ ] Ověřit automatické prodloužení domény u Wedosu a kdo ho platí.

- [ ] **13. Záznamy o činnostech zpracování (čl. 30 GDPR)** – sepsáno 2026-10-23: `web-dokumenty/zakazky/pedikura/zaznamy-o-cinnostech-zpracovani.md` (interní, nezveřejňuje se). Výjimka pro malé firmy (čl. 30 odst. 5) se nepoužije, zpracování není příležitostné.
  - [ ] Předat provozovateli (vytisknout nebo poslat).

- [x] **14. Admin účty** (hotovo 2026-10-23): silné heslo a 2FA na Vercelu, Neonu, Resendu, SMSManageru a GitHubu (zavázáno ve zpracovatelské smlouvě, čl. III odst. 3).

## Po dokončení

- [ ] Podepsat dokumenty z `web-dokumenty` (`./build.ps1 pedikura`): smlouva o dílo, zpracovatelská smlouva, předávací protokol. Po zaplacení potvrzení o přijetí platby. PDF znovu vygenerována 2026-10-23 (GitHub mezi zpracovateli, Vercel placený zhotovitelem).
- [x] Přepsat `EFFECTIVE_DATE` v zásadách na datum nasazení (23. 10. 2026).
- [ ] Mergnout `feat/shared-business-info` do `main`.
- [x] Zapnout rezervace (`lib/booking-enabled.ts`) – 2026-10-23.
