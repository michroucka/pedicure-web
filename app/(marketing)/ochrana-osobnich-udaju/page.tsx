import type { Metadata } from "next";
import { BUSINESS_INFO, OPERATOR_INFO } from "@/lib/business-info.ts";
import {
    BACKUP_RETENTION_DAYS,
    CLIENT_RETENTION_YEARS,
} from "@/lib/data-retention.ts";

export const metadata: Metadata = {
    title: "Ochrana osobních údajů",
    description: `Jak pedikúra ${BUSINESS_INFO.name} zpracovává osobní údaje klientů – účel, doba uložení a vaše práva.`,
    alternates: { canonical: "/ochrana-osobnich-udaju" },
};

// Bump on every substantive change to the text below.
const EFFECTIVE_DATE = "23. 10. 2026";

// `data` only where Art. 13 GDPR isn't enough: guest names come from the main
// contact (Art. 14), and the client never types the web technical data.
const PURPOSES: {
    purpose: string;
    data?: string;
    basis: string;
    retention: string;
}[] = [
    {
        purpose: "Rezervace, potvrzení e-mailem a připomenutí SMS",
        data: "jméno, telefon, e-mail, termín a zvolená služba; u skupinové rezervace i jména dalších osob",
        basis: "plnění smlouvy (čl. 6 odst. 1 písm. b GDPR)",
        retention: "po dobu trvání rezervace, poté jako evidence klientů",
    },
    {
        purpose: "Evidence klientů a historie návštěv",
        basis: "oprávněný zájem na evidenci klientů a ochraně práv (čl. 6 odst. 1 písm. f GDPR)",
        retention: `${CLIENT_RETENTION_YEARS} roky od poslední návštěvy`,
    },
    {
        purpose: "Provoz a zabezpečení webu, anonymní statistika návštěvnosti",
        data: "IP adresa, údaje o prohlížeči a zařízení",
        basis: "oprávněný zájem na bezpečném a funkčním webu (čl. 6 odst. 1 písm. f GDPR)",
        retention: "dle nastavení poskytovatele hostingu, řádově dny až týdny",
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
const PROSE =
    "max-w-prose text-sm leading-relaxed text-pretty text-muted-foreground";
const P = `mt-3 ${PROSE}`;

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
                        href={`mailto:${BUSINESS_INFO.privacyEmail}`}
                        className="underline underline-offset-2"
                    >
                        {BUSINESS_INFO.privacyEmail}
                    </a>
                    .
                </p>

                <h2 className={H2}>
                    Jaké údaje se zpracovávají, proč a jak dlouho
                </h2>
                {PURPOSES.map((item) => (
                    <div key={item.purpose} className="mt-6">
                        <h3 className="text-base">{item.purpose}</h3>
                        <p className={`mt-1 ${PROSE}`}>
                            {item.data && (
                                <>
                                    Údaje: {item.data}
                                    <br />
                                </>
                            )}
                            Právní základ: {item.basis}
                            <br />
                            Doba uložení: {item.retention}
                        </p>
                    </div>
                ))}
                <p className={P}>
                    Stejně se zpracovávají i rezervace domluvené telefonicky
                    nebo osobně v provozovně.
                </p>
                <p className={P}>
                    Zálohy databáze se uchovávají {BACKUP_RETENTION_DAYS} dní,
                    smazané údaje z nich zmizí nejpozději po této době.
                </p>
                <p className={P}>
                    Správce nesbírá ani neeviduje údaje o zdravotním stavu.
                    Neprobíhá automatizované rozhodování ani profilování.
                </p>
                <p className={P}>
                    Poskytnutí údajů k rezervaci je dobrovolné, bez nich ale
                    rezervaci online provést nelze.
                </p>

                <h2 className={H2}>Kdo k údajům má přístup</h2>
                {/* Categories of recipients are enough (Art. 13(1)(e) GDPR).
                    The named list is in the processing agreement
                    (gdpr.podzpracovatele in web-dokumenty zakazka.yaml). */}
                <p className={P}>
                    K údajům má kromě správce přístup jen správce webu a
                    poskytovatelé technických služeb (hosting, databáze a
                    zálohy, e-mail, SMS, kalendář).
                </p>
                <p className={P}>
                    Někteří poskytovatelé sídlí v USA. Předání je zajištěno
                    rámcem EU-US Data Privacy Framework nebo standardními
                    smluvními doložkami Evropské komise.
                </p>

                <h2 className={H2}>Cookies</h2>
                <p className={P}>
                    Web používá jen technicky nezbytné cookies, statistika
                    návštěvnosti funguje bez nich.
                </p>
                <p className={P}>
                    Mapa na stránce Kontakt se načte až po kliknutí. Poté může
                    služba Mapy.com ukládat vlastní cookies podle svých zásad.
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
                        href={`mailto:${BUSINESS_INFO.privacyEmail}`}
                        className="underline underline-offset-2"
                    >
                        {BUSINESS_INFO.privacyEmail}
                    </a>
                    . Správce ji vyřídí nejpozději do 1 měsíce.
                </p>
                <p className={P}>
                    Pokud se domníváte, že se s vašimi údaji nakládá v rozporu s
                    právem, můžete podat stížnost na{" "}
                    <span className="text-foreground">
                        Úřad pro ochranu osobních údajů
                    </span>{" "}
                    (
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
