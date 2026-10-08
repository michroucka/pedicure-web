# TODO: právní náležitosti a provoz před spuštěním rezervací

Kontext: web provozuje podnikatel (OSVČ, viz patička na `/kontakt`). Online rezervace
sbírají jméno, telefon a e-mail klientů, takže web musí splňovat GDPR. Smlouvy mezi
vývojářem a provozovatelem jsou v samostatném repu `web-dokumenty` (zakázka `pedikura`).
Vzor zásad je v `../web-dokumenty/sablony/web/zasady-ochrany-osobnich-udaju.md`.

Rezervace jsou zatím vypnuté (`lib/booking-enabled.ts`). Bod 1–4 je potřeba hotový **před** jejich zapnutím.

## Kód

- [ ] **1. Stránka Zásady ochrany osobních údajů** (např. `/ochrana-osobnich-udaju` v `(marketing)`)
  - Text podle vzoru výše. Doplnit údaje správce z patičky `/kontakt`, dobu uchování (návrh: 3 roky od poslední návštěvy) a správce webu jako zpracovatele.
  - Seznam zpracovatelů musí sedět s tím, co aplikace skutečně používá: Vercel (hosting + `@vercel/analytics` + `@vercel/speed-insights`), Neon, Resend, SMSManager, Web Push.
  - Přidat do sitemapy.
- [ ] **2. Odkazy na zásady**
  - patička všech marketingových stránek,
  - rezervační formulář (`app/rezervace/details`): pod tlačítko odeslání informační věta typu „Odesláním rezervace berete na vědomí zpracování osobních údajů podle [zásad](…)“. Checkbox se souhlasem **není** potřeba, právním základem je plnění smlouvy.
  - patička potvrzovacího e-mailu (`emails/`).
- [ ] **3. Identifikace provozovatele v patičce celého webu**, nejen na `/kontakt`: jméno, sídlo, IČO a „zapsán v živnostenském rejstříku“ (§ 435 OZ). Ověřit, jestli to stávající patička splňuje.
- [ ] **4. Cookies – audit**
  - Ověřit (DevTools → Application → Cookies) na marketingových stránkách a v rezervaci, že se nastavují jen nezbytné cookies (session Auth.js v adminu).
  - Vercel Analytics i Speed Insights jsou bez cookies, takže by lišta neměla být potřeba. Výsledek zapsat do sekce Cookies v zásadách.
  - Pokud se někdy přidá Google Analytics, Meta Pixel apod., je nutná cookie lišta se souhlasem.
- [ ] **5. Mazání klienta v administraci** (právo na výmaz). Admin teď klienta smazat nemůže.
  - Přidat do `client-edit-dialog` akci „Smazat klienta“ s potvrzením. Smaže klienta i jeho rezervace, nebo budoucí rezervace zruší a historii anonymizuje.
  - Napsat k tomu test.
- [ ] **6. Automatický úklid starých dat**: cron (Vercel Cron už se používá) jednou měsíčně anonymizuje nebo smaže klienty bez návštěvy déle než zvolenou dobu (stejná doba jako v zásadách). Volitelné, ale bez toho se musí mazat ručně.
- [ ] **7. Pole `note` u klienta a rezervace**: do UI přidat nápovědu „Nezapisujte zdravotní údaje (diagnózy, nemoci)“. Zdravotní údaje jsou zvláštní kategorie podle čl. 9 GDPR a vyžadovaly by výslovný souhlas klienta. Pokud se do poznámky může dostat text od klienta z rezervačního formuláře, tam to samé.

## Provoz a účty (bez kódu)

- [ ] **8. Vercel Hobby (free) tarif nesmí být použit komerčně.** Podmínky Vercelu omezují Hobby na osobní a nekomerční užití, web podnikatele je komerční. Možnosti:
  
  - Vercel Pro (20 USD/měsíc),
  - přesun na hosting, který komerční užití ve free tarifu povoluje (ověřit aktuální podmínky např. u Netlify nebo Cloudflare; Next.js + cron a ICS feed musí jít přenést),
  - vlastní VPS.
  
  Rozhodnout a případné náklady domluvit s provozovatelem. Smlouva o dílo s tím počítá (čl. Provoz, odst. 2).

- [ ] **9. Neon**:
  
  - ověřit, že produkční projekt je v EU regionu (doplnit do zásad i do `web-dokumenty/zakazky/pedikura/zakazka.yaml`),
  - zkontrolovat limity free tarifu a délku obnovy dat (PITR),
  - zvážit vlastní pravidelnou zálohu (`pg_dump` přes GitHub Action do privátního úložiště, šifrovaně).

- [ ] **10. Resend**: ověřená odesílací doména. Zkontrolovat, že free tarif pokrývá objem e-mailů.

- [ ] **11. SMSManager**: účet je na vývojáře, kredit platí provozovatel. Aby šel kredit provozovateli do účetnictví jako výdaj, musí být **doklad za kredit vystavený na jeho IČO**. Buď převést účet na provozovatele, nebo nastavit fakturační údaje provozovatele.

- [ ] **12. Doména `pedikurakralovice.cz`**: zjistit držitele. Ideálně provozovatel. Výsledek zapsat do `zakazka.yaml` (`provoz.domena_drzitel`).

- [ ] **13. Záznamy o činnostech zpracování (čl. 30 GDPR)**: provozovatel by měl mít jednostránkový přehled zpracování (účel, údaje, doba, zpracovatelé). Dá se odvodit ze zásad. Není to kód, ale patří to k spuštění.

- [ ] **14. Admin účty**: silné heslo a 2FA na Vercelu, Neonu, Resendu, SMSManageru a GitHubu (zavázáno ve zpracovatelské smlouvě, čl. III odst. 3).

## Po dokončení

- [ ] Podepsat dokumenty z `web-dokumenty` (`./build.ps1 pedikura`): smlouva o dílo, zpracovatelská smlouva, předávací protokol. Po zaplacení potvrzení o přijetí platby.
- [ ] Zapnout rezervace (`lib/booking-enabled.ts`).
