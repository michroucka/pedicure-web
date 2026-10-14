# TODO: právní náležitosti a provoz před spuštěním rezervací

Kontext: web provozuje podnikatel (OSVČ, viz patička na `/kontakt`). Online rezervace
sbírají jméno, telefon a e-mail klientů, takže web musí splňovat GDPR. Smlouvy mezi
vývojářem a provozovatelem jsou v samostatném repu `web-dokumenty` (zakázka `pedikura`).
Vzor zásad je v `../web-dokumenty/sablony/web/zasady-ochrany-osobnich-udaju.md`.

Rezervace jsou zatím vypnuté (`lib/booking-enabled.ts`). Bod 1–4 je potřeba hotový **před** jejich zapnutím.

**Stav 2026-10-14:** body 1, 2, 3, 5 hotové, 4 čeká na ověřovací audit. Zbývá 7 (+ volitelně 6) a body bez kódu.
Práce je na větvi `feat/shared-business-info` (nepushnutá, ne v `main`).

## Kód

- [x] **1. Stránka Zásady ochrany osobních údajů** – hotovo 2026-10-14
  - `app/(marketing)/ochrana-osobnich-udaju/page.tsx`, v sitemapě. Zdrojový text: `web-dokumenty/zakazky/pedikura/zasady-ochrany-osobnich-udaju.md` (rozhodnutí v komentáři nahoře) – **při změně upravit obojí**.
  - Údaje správce z `lib/business-info.ts` (`OPERATOR_INFO`, `BUSINESS_INFO`), doby uchování z `lib/data-retention.ts` (3 roky od poslední návštěvy, zálohy 30 dní).
  - Zpracovatelé: správce webu, Vercel (hosting + Analytics + Speed Insights), Neon (EU), Resend, SMSManager, GitHub (zálohy). Web Push záměrně ne – obsah je šifrovaný end-to-end.
  - Neosobní tvar („správce“), bez řádku Účetnictví (doklady se vydávají bez jména), kontakt pro žádosti `rouckova@pedikurakralovice.cz`.
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
  - Pozn.: skrytý klient zůstává v DB kvůli historii – úplné odstranění řeší až bod 6.
- [ ] **6. Automatický úklid starých dat** (volitelné): cron jednou měsíčně anonymizuje nebo smaže klienty bez návštěvy déle než `CLIENT_RETENTION_YEARS` (`lib/data-retention.ts`). Bez něj se musí mazat ručně – zásady slibují 3 roky.
- [ ] **7. Pole `note` u klienta a rezervace**: do UI v adminu (`client-edit-dialog`, `add-booking-dialog`, `booking-detail-dialog`) přidat nápovědu „Nezapisujte zdravotní údaje (diagnózy, nemoci)“. Zdravotní údaje jsou zvláštní kategorie podle čl. 9 GDPR a vyžadovaly by výslovný souhlas klienta. Online formulář pole na poznámku nemá, tam nic.

## Provoz a účty (bez kódu)

- [ ] **8. Vercel Hobby (free) tarif nesmí být použit komerčně.** Podmínky Vercelu omezují Hobby na osobní a nekomerční užití, web podnikatele je komerční. Možnosti:
  
  - Vercel Pro (20 USD/měsíc),
  - přesun na hosting, který komerční užití ve free tarifu povoluje (ověřit aktuální podmínky např. u Netlify nebo Cloudflare; Next.js + cron a ICS feed musí jít přenést),
  - vlastní VPS.
  
  Rozhodnout a případné náklady domluvit s provozovatelem. Smlouva o dílo s tím počítá (čl. Provoz, odst. 2).

- [x] **9. Neon**:
  
  - ~~ověřit, že produkční projekt je v EU regionu~~ – ověřeno 2026-10-11: `aws-eu-central-1` (Frankfurt). Doplněno do zásad i do `zakazka.yaml` (2026-10-14),
  - ~~zkontrolovat limity free tarifu a délku obnovy dat (PITR)~~ – free tarif: PITR jen 6 h, 1 ruční snapshot, plánované snapshoty ne,
  - ~~zvážit vlastní pravidelnou zálohu~~ – hotovo 2026-10-11: soukromé repo `michroucka/pedicure-db-backup`, noční `pg_dump` šifrovaný AES-256, artefakty GitHub Actions s uchováním 30 dní. Postup obnovy v jeho README.

- [ ] **10. Resend**: ověřená odesílací doména. Zkontrolovat, že free tarif pokrývá objem e-mailů.

- [ ] **11. SMSManager**: účet je na vývojáře, kredit platí provozovatel. Aby šel kredit provozovateli do účetnictví jako výdaj, musí být **doklad za kredit vystavený na jeho IČO**. Buď převést účet na provozovatele, nebo nastavit fakturační údaje provozovatele.

- [ ] **12. Doména `pedikurakralovice.cz`**: zjistit držitele. Ideálně provozovatel. V `zakazka.yaml` je zatím `domena_drzitel: "Miroslav Roučka"` s TODO – ověřit (např. whois / registrátor).

- [ ] **13. Záznamy o činnostech zpracování (čl. 30 GDPR)**: provozovatel by měl mít jednostránkový přehled zpracování (účel, údaje, doba, zpracovatelé). Dá se odvodit z hotových zásad (`web-dokumenty/zakazky/pedikura/zasady-ochrany-osobnich-udaju.md`). Není to kód, ale patří to k spuštění.

- [ ] **14. Admin účty**: silné heslo a 2FA na Vercelu, Neonu, Resendu, SMSManageru a GitHubu (zavázáno ve zpracovatelské smlouvě, čl. III odst. 3).

## Po dokončení

- [ ] Podepsat dokumenty z `web-dokumenty` (`./build.ps1 pedikura`): smlouva o dílo, zpracovatelská smlouva, předávací protokol. Po zaplacení potvrzení o přijetí platby. Pozor: od 2026-10-14 je v seznamu zpracovatelů i GitHub (zálohy) – vygenerovat PDF znovu.
- [ ] Přepsat `EFFECTIVE_DATE` v zásadách na datum nasazení.
- [ ] Mergnout `feat/shared-business-info` do `main`.
- [ ] Zapnout rezervace (`lib/booking-enabled.ts`). Pozor: v pracovním stromu je lokálně `true` necommitnuté – necommitovat dřív.
