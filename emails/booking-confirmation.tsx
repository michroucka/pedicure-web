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
import { BUSINESS_INFO } from "../lib/business-info";

const BRAND = `${BUSINESS_INFO.name} – ${BUSINESS_INFO.tagline}`;

type Person = { name: string; serviceName: string };

// "moved" goes out after a reschedule (client via magic link or the
// pedikérka in admin): a move cancels + recreates the booking, so the old
// email's link stops working – this one carries the new link.
export type BookingEmailVariant = "created" | "moved";

// Bodies follow "Dobrý den," - Czech continues after a comma salutation in
// lowercase; "Vaše" keeps its capital V as the polite form, not as a
// sentence start.
const COPY: Record<
    BookingEmailVariant,
    { preview: string; heading: string; body: string }
> = {
    created: {
        preview: "je potvrzena",
        heading: "Rezervace potvrzena",
        body: "děkuji za rezervaci, těším se na Vás. Zde je její\u00a0shrnutí:",
    },
    moved: {
        preview: "– termín byl změněn",
        heading: "Rezervace přesunuta",
        body: "Vaše rezervace byla přesunuta na nový termín:",
    },
};

const BASE_URL = BUSINESS_INFO.siteUrl;

// Email clients fetch images over the internet when the message is opened,
// so this has to be an absolute URL – and a raster format, since SVG
// support in email clients (Outlook especially) is unreliable. Rasterized
// from public/logo-banner-light.svg into public/logo-email-banner.png (3x)
// for this reason. The older round logo-email.png stays in public/ - emails
// already sitting in inboxes still load it.
const LOGO_URL = `${BASE_URL}/logo-email-banner.png`;

const ADDRESS = `${BUSINESS_INFO.address.street}, ${BUSINESS_INFO.address.city}`;

export function BookingConfirmationEmail({
    people,
    dateLabel,
    timeLabel,
    totalPrice,
    manageUrl,
    variant = "created",
}: {
    people: Person[];
    dateLabel: string;
    timeLabel: string;
    totalPrice: number;
    manageUrl: string;
    variant?: BookingEmailVariant;
}) {
    const copy = COPY[variant];
    return (
        <Html>
            <Head>
                {/* "light dark" + a matching @media (prefers-color-scheme:
                dark) override was tried here first – the generally
                recommended approach – but on real-device testing it made
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
                        width="220"
                        height="60"
                        alt={BUSINESS_INFO.tagline}
                        style={logo}
                    />
                    <Heading style={heading}>{copy.heading}</Heading>
                    {/* No name: Czech needs the vocative ("Jano"), which
                        can't be derived reliably from a typed-in name. */}
                    <Text style={text}>Dobrý den,</Text>
                    <Text style={text}>{copy.body}</Text>

                    <Section style={card}>
                        {/* When to come leads; where and how much follow,
                            quieter, under a divider. */}
                        <Text style={cardWhen}>
                            {dateLabel}, {timeLabel}
                        </Text>
                        {people.map((person, i) => (
                            <Text
                                key={i}
                                style={cardLine}
                            >
                                {person.name} – {person.serviceName}
                            </Text>
                        ))}
                        <Hr style={cardHr} />
                        <Link
                            href={BUSINESS_INFO.mapsUrl}
                            style={cardLink}
                        >
                            {ADDRESS}
                        </Link>
                        <Text style={cardMuted}>
                            Celkem {totalPrice.toLocaleString("cs-CZ")} Kč
                        </Text>
                    </Section>

                    <Button
                        href={manageUrl}
                        style={button}
                    >
                        Spravovat rezervaci
                    </Button>

                    <Text style={mutedText}>
                        Rezervaci můžete zrušit nebo přesunout nejpozději 24
                        hodin před termínem. Později mi prosím zavolejte na{" "}
                        <Link
                            href={`tel:${BUSINESS_INFO.phone}`}
                            style={mutedLink}
                        >
                            {BUSINESS_INFO.phoneDisplay}
                        </Link>
                        .
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
    margin: "0 auto 24px",
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

const cardWhen: React.CSSProperties = {
    ...cardLine,
    fontSize: "16px",
    fontWeight: 700,
    lineHeight: "22px",
    margin: "0 0 8px",
};

const cardHr: React.CSSProperties = {
    borderColor: "#5c464b",
    margin: "12px 0",
};

const cardMuted: React.CSSProperties = {
    ...cardLine,
    color: "#afa294",
};

const cardLink: React.CSSProperties = {
    ...cardMuted,
    display: "block",
    textDecoration: "underline",
    textDecorationColor: "#7a6469",
};

const mutedLink: React.CSSProperties = {
    color: "#f4e9de",
    whiteSpace: "nowrap",
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
// package.json's `email:dev` script) – lets you preview this template live
// in a browser with mock data, without actually sending anything.
export default BookingConfirmationEmail;

BookingConfirmationEmail.PreviewProps = {
    people: [
        { name: "Jana Nováková", serviceName: "Pedikúra klasik" },
        { name: "Petra Nováková", serviceName: "Pedikúra s lakem" },
    ],
    dateLabel: "29. srpna 2026",
    timeLabel: "09:00 – 10:15",
    totalPrice: 1050,
    manageUrl:
        "https://www.pedikurakralovice.cz/rezervace/sprava/preview-token",
    variant: "created",
} satisfies Parameters<typeof BookingConfirmationEmail>[0];
