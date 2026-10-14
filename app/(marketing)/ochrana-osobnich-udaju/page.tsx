import type { Metadata } from "next";
import { BUSINESS_INFO, OPERATOR_INFO } from "@/lib/business-info.ts";
import {
    BACKUP_RETENTION_DAYS,
    CLIENT_RETENTION_YEARS,
} from "@/lib/data-retention.ts";

export const metadata: Metadata = {
    title: "Ochrana osobních údajů",
    description:
        "Jak pedikúra Nohy v cajku zpracovává osobní údaje klientů – účel, doba uložení, zpracovatelé a vaše práva.",
    alternates: { canonical: "/ochrana-osobnich-udaju" },
};

// Bump on every substantive change to the text below.
const EFFECTIVE_DATE = "14. 10. 2026";

const RETENTION = `${CLIENT_RETENTION_YEARS} roky od poslední návštěvy`;

const PURPOSES = [
    {
        purpose: "Vyřízení rezervace a poskytnutí služby",
        data: "jméno, telefon, e-mail, termín a zvolená služba; u skupinové rezervace i jména dalších osob",
        basis: "plnění smlouvy (čl. 6 odst. 1 písm. b GDPR)",
        retention: "po dobu trvání rezervace, poté jako evidence klientů",
    },
    {
        purpose: "Potvrzení rezervace e-mailem a připomenutí termínu SMS",
        data: "e-mail, telefon, termín",
        basis: "plnění smlouvy (čl. 6 odst. 1 písm. b GDPR)",
        retention: "do uskutečnění termínu",
    },
    {
        purpose: "Evidence klientů a historie návštěv",
        data: "jméno, kontakt, historie rezervací, provozní poznámky",
        basis: "oprávněný zájem na evidenci klientů a ochraně práv (čl. 6 odst. 1 písm. f GDPR)",
        retention: RETENTION,
    },
    {
        purpose: "Provoz a zabezpečení webu, anonymní statistika návštěvnosti",
        data: "IP adresa, údaje o prohlížeči a zařízení",
        basis: "oprávněný zájem na bezpečném a funkčním webu (čl. 6 odst. 1 písm. f GDPR)",
        retention: "dle nastavení poskytovatele hostingu, řádově dny až týdny",
    },
];

// Must match what the app actually uses (and gdpr.podzpracovatele in
// web-dokumenty/zakazky/pedikura/zakazka.yaml). Web Push isn't listed on
// purpose: payloads are end-to-end encrypted, the push service can't read them.
const PROCESSORS = [
    {
        name: "Bc. Michal Roučka",
        detail: null,
        role: "technická správa webu a rezervačního systému",
    },
    {
        name: "Vercel Inc.",
        detail: "USA",
        role: "hosting webu, anonymní statistika návštěvnosti a měření výkonu webu",
    },
    {
        name: "Neon",
        detail: "Databricks, Inc., USA; data uložena v EU, Frankfurt",
        role: "databáze rezervací",
    },
    {
        name: "Resend",
        detail: "Plus Five Five, Inc., USA",
        role: "odesílání potvrzovacích e-mailů",
    },
    {
        name: "SMSManager.cz",
        detail: "ČR",
        role: "odesílání SMS připomínek",
    },
    {
        name: "GitHub, Inc.",
        detail: "USA",
        role: "úložiště šifrovaných záloh databáze",
    },
];

const RIGHTS = [
    "požádat o přístup ke svým údajům a o jejich kopii",
    "požádat o opravu nepřesných údajů",
    "požádat o výmaz údajů, pokud již nejsou potřeba nebo se zpracovávají neoprávněně",
    "požádat o omezení zpracování",
    "na přenositelnost údajů zpracovávaných na základě smlouvy",
    "vznést námitku proti zpracování na základě oprávněného zájmu",
];

const H2 = "mt-10 text-2xl";
const P = "mt-3 max-w-prose text-sm leading-relaxed text-pretty text-muted-foreground";

export default function OchranaOsobnichUdajuPage() {
    return (
        <section>
            <div className="mx-auto max-w-3xl px-4 pt-8 pb-12 sm:px-6">
                <h1 className="italic">Ochrana osobních údajů</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    Platné od {EFFECTIVE_DATE}
                </p>

                <h2 className={H2}>Kdo vaše údaje zpracovává</h2>
                <p className={P}>
                    Správcem osobních údajů je{" "}
                    <span className="text-foreground">
                        {OPERATOR_INFO.name}
                    </span>
                    , IČO {OPERATOR_INFO.ico}, se sídlem {OPERATOR_INFO.address}
                    , provozovatel pedikúry {BUSINESS_INFO.name} (dále
                    „správce“).
                </p>
                <p className={P}>
                    Kontakt pro otázky k osobním údajům:{" "}
                    <a
                        href={`mailto:info@pedikurakralovice.cz`}
                        className="underline underline-offset-2"
                    >
                        info@pedikurakralovice.cz
                    </a>
                    .
                </p>

                <h2 className={H2}>
                    Jaké údaje se zpracovávají, proč a jak dlouho
                </h2>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {PURPOSES.map((item) => (
                        <div
                            key={item.purpose}
                            className="rounded-2xl border border-border bg-card px-5 py-4"
                        >
                            <h3 className="text-base">{item.purpose}</h3>
                            <dl className="mt-2 space-y-2 text-sm">
                                <div>
                                    <dt className="font-medium">Údaje</dt>
                                    <dd className="text-muted-foreground">
                                        {item.data}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="font-medium">
                                        Právní základ
                                    </dt>
                                    <dd className="text-muted-foreground">
                                        {item.basis}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="font-medium">
                                        Doba uložení
                                    </dt>
                                    <dd className="text-muted-foreground">
                                        {item.retention}
                                    </dd>
                                </div>
                            </dl>
                        </div>
                    ))}
                </div>
                <p className={P}>
                    Stejně se zpracovávají i rezervace domluvené telefonicky
                    nebo osobně v provozovně.
                </p>
                <p className={P}>
                    Databáze se denně zálohuje v šifrované podobě a zálohy se
                    uchovávají {BACKUP_RETENTION_DAYS} dní. Smazané údaje tak ze
                    záloh zmizí nejpozději po {BACKUP_RETENTION_DAYS} dnech.
                </p>
                <p className={P}>
                    Údaje o zdravotním stavu správce nesbírá ani neeviduje.
                </p>
                <p className={P}>
                    Poskytnutí údajů k rezervaci je dobrovolné, bez nich ale
                    rezervaci online provést nelze. Objednat se můžete i
                    telefonicky.
                </p>

                <h2 className={H2}>Kdo k údajům má přístup</h2>
                <p className={P}>
                    Vaše údaje se neprodávají ani nepředávají pro marketing.
                    Přístup k nim mají jen poskytovatelé služeb, které web
                    potřebuje ke svému chodu (zpracovatelé):
                </p>
                <ul className="mt-3 max-w-prose list-disc space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground">
                    {PROCESSORS.map((p) => (
                        <li key={p.name}>
                            <span className="text-foreground">{p.name}</span>
                            {p.detail && ` (${p.detail})`} – {p.role}
                        </li>
                    ))}
                </ul>
                <p className={P}>
                    Poskytovatelé se sídlem v USA jsou certifikováni v rámci
                    EU-US Data Privacy Framework, případně je předání zajištěno
                    standardními smluvními doložkami schválenými Evropskou
                    komisí.
                </p>

                <h2 className={H2}>Cookies</h2>
                <p className={P}>
                    Web používá pouze technicky nezbytné cookies (pro přihlášení
                    do administrace). Statistika návštěvnosti funguje bez
                    cookies a bez identifikace konkrétních návštěvníků, proto se
                    souhlas nevyžaduje.
                </p>

                <h2 className={H2}>Vaše práva</h2>
                <p className={P}>Máte právo:</p>
                <ul className="mt-3 max-w-prose list-disc space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground">
                    {RIGHTS.map((right) => (
                        <li key={right}>{right}</li>
                    ))}
                </ul>
                <p className={P}>
                    Žádost stačí poslat na{" "}
                    <a
                        href={`mailto:info@pedikurakralovice.cz`}
                        className="underline underline-offset-2"
                    >
                        info@pedikurakralovice.cz
                    </a>
                    . Správce ji vyřídí bez zbytečného odkladu, nejpozději do 1
                    měsíce.
                </p>
                <p className={P}>
                    Pokud se domníváte, že se s vašimi údaji nakládá v rozporu s
                    právem, můžete podat stížnost u{" "}
                    <span className="text-foreground">
                        Úřadu pro ochranu osobních údajů
                    </span>{" "}
                    (Pplk. Sochora 27, 170 00 Praha 7,{" "}
                    <a
                        href="https://uoou.gov.cz"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline underline-offset-2"
                    >
                        uoou.gov.cz
                    </a>
                    ).
                </p>
            </div>
        </section>
    );
}
