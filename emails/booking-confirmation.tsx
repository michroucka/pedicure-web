import {
    Body,
    Button,
    Container,
    Head,
    Heading,
    Hr,
    Html,
    Img,
    Link,
    Preview,
    Section,
    Text,
} from "@react-email/components";
import { BUSINESS_INFO } from "../lib/business-info.ts";

const BRAND = `${BUSINESS_INFO.name} – ${BUSINESS_INFO.tagline}`;

type Person = { name: string; serviceName: string };

// "moved" goes out after a reschedule (client via magic link or the
// pedikérka in admin): a move cancels + recreates the booking, so the old
// email's link stops working — this one carries the new link.
export type BookingEmailVariant = "created" | "moved";

const COPY: Record<
    BookingEmailVariant,
    { preview: string; heading: string; body: string }
> = {
    created: {
        preview: "je potvrzena",
        heading: "Rezervace potvrzena!",
        body: `Vaše rezervace v ${BRAND} byla úspěšně vytvořena.`,
    },
    moved: {
        preview: "– termín byl změněn",
        heading: "Rezervace přesunuta",
        body: `Vaše rezervace v ${BRAND} byla přesunuta na nový termín. Pro správu rezervace použijte tlačítko níže.`,
    },
};

const BASE_URL = "https://www.pedikurakralovice.cz";

// Email clients fetch images over the internet when the message is opened,
// so this has to be an absolute URL — and a raster format, since SVG
// support in email clients (Outlook especially) is unreliable. Rasterized
// from public/logo-light.svg into public/logo-email.png for this reason.
const LOGO_URL = `${BASE_URL}/logo-email.png`;

export function BookingConfirmationEmail({
    clientName,
    people,
    dateLabel,
    timeLabel,
    manageUrl,
    variant = "created",
}: {
    clientName: string;
    people: Person[];
    dateLabel: string;
    timeLabel: string;
    manageUrl: string;
    variant?: BookingEmailVariant;
}) {
    const copy = COPY[variant];
    return (
        <Html>
            <Head>
                {/* "light dark" + a matching @media (prefers-color-scheme:
                dark) override was tried here first — the generally
                recommended approach — but on real-device testing it made
                mobile dark-mode inversion worse, not better. "light only"
                is what actually stopped the client from touching our fixed
                dark-plum/gold palette, so that's what stays: real-device
                results over generic best-practice advice. */}
                <meta
                    name="color-scheme"
                    content="light only"
                />
                <meta
                    name="supported-color-schemes"
                    content="light only"
                />
            </Head>
            <Preview>{`Rezervace na ${dateLabel} v ${timeLabel} ${copy.preview}`}</Preview>
            <Body style={body}>
                <Container style={container}>
                    <Img
                        src={LOGO_URL}
                        width="128"
                        height="128"
                        alt={BUSINESS_INFO.tagline}
                        style={logo}
                    />
                    <Heading style={heading}>{copy.heading}</Heading>
                    <Text style={text}>Dobrý den, {clientName},</Text>
                    <Text style={text}>{copy.body}</Text>

                    <Section style={card}>
                        {people.map((person, i) => (
                            <Text
                                key={i}
                                style={cardLine}
                            >
                                {person.name} – {person.serviceName}
                            </Text>
                        ))}
                        <Text style={cardLine}>{dateLabel}</Text>
                        <Text style={cardLine}>{timeLabel}</Text>
                    </Section>

                    <Button
                        href={manageUrl}
                        style={button}
                    >
                        Spravovat rezervaci
                    </Button>

                    <Text style={mutedText}>
                        Rezervaci můžete zrušit nebo přesunout nejpozději 24
                        hodin před termínem.
                    </Text>

                    <Hr style={hr} />

                    <Link
                        href={BASE_URL}
                        style={footer}
                    >
                        {BRAND}
                    </Link>
                    <Link
                        href={`${BASE_URL}/ochrana-osobnich-udaju`}
                        style={footerSecondary}
                    >
                        Ochrana osobních údajů
                    </Link>
                </Container>
            </Body>
        </Html>
    );
}

const body: React.CSSProperties = {
    backgroundColor: "#38252a",
    fontFamily: "Helvetica, Arial, sans-serif",
    padding: "32px 16px",
};

const container: React.CSSProperties = {
    backgroundColor: "#483439",
    borderRadius: "12px",
    margin: "0 auto",
    maxWidth: "480px",
    padding: "32px",
};

const logo: React.CSSProperties = {
    display: "block",
    margin: "0 auto 16px",
};

const heading: React.CSSProperties = {
    color: "#f4e9de",
    fontSize: "22px",
    margin: "0 0 16px",
};

const text: React.CSSProperties = {
    color: "#f4e9de",
    fontSize: "15px",
    lineHeight: "22px",
    margin: "0 0 12px",
};

const mutedText: React.CSSProperties = {
    ...text,
    color: "#afa294",
    fontSize: "13px",
    margin: "16px 0 12px",
    textAlign: "center",
    textWrap: "pretty",
};

const card: React.CSSProperties = {
    backgroundColor: "#3e2e32",
    borderRadius: "8px",
    margin: "16px 0",
    padding: "16px 20px",
};

const cardLine: React.CSSProperties = {
    color: "#f4e9de",
    fontSize: "14px",
    lineHeight: "20px",
    margin: "0",
};

const button: React.CSSProperties = {
    backgroundColor: "#e2a156",
    borderRadius: "8px",
    color: "#211015",
    display: "block",
    fontSize: "15px",
    fontWeight: 600,
    padding: "12px 20px",
    textAlign: "center",
    textDecoration: "none",
};

const hr: React.CSSProperties = {
    borderColor: "#5c464b",
    margin: "24px 0 16px",
};

const footer: React.CSSProperties = {
    color: "#afa294",
    display: "block",
    fontSize: "12px",
    margin: "0",
    textAlign: "center",
};

const footerSecondary: React.CSSProperties = {
    ...footer,
    fontSize: "11px",
    marginTop: "8px",
    textDecoration: "underline",
};

// Default export + PreviewProps is the `react-email dev` convention (see
// package.json's `email:dev` script) — lets you preview this template live
// in a browser with mock data, without actually sending anything.
export default BookingConfirmationEmail;

BookingConfirmationEmail.PreviewProps = {
    clientName: "Jana Nováková",
    people: [
        { name: "Jana Nováková", serviceName: "Pedikúra klasik" },
        { name: "Petra Nováková", serviceName: "Pedikúra s lakem" },
    ],
    dateLabel: "29. srpna 2026",
    timeLabel: "09:00 – 10:15",
    manageUrl: "https://www.pedikurakralovice.cz/rezervace/sprava/preview-token",
    variant: "created",
} satisfies Parameters<typeof BookingConfirmationEmail>[0];
