import { notFound } from "next/navigation";
import { getBookingGroupByToken } from "@/lib/get-booking-group-by-token";
import { findMovedBookingGroup } from "@/lib/find-moved-booking";
import { canClientModifyBooking } from "@/lib/booking-modification-window";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { formatTime } from "@/lib/utils";
import { getBookingPersonName } from "@/lib/get-booking-person-name";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
    ArrowLeft,
    ArrowRightLeft,
    Banknote,
    CalendarDays,
    CalendarPlus,
    CheckCircle2,
    Clock,
    MapPin,
    Plus,
    UserRound,
    XCircle,
} from "lucide-react";
import { ManageBooking } from "@/components/rezervace/manage-booking";
import Link from "next/link";
import { CzechText } from "@/components/czech-text";
import { BUSINESS_INFO } from "@/lib/business-info";
import { ClearBookingDraft } from "@/components/rezervace/use-booking-draft";

export default async function SpravaPage({
    params,
    searchParams,
}: {
    params: Promise<{ token: string }>;
    // ?moved=1 – set by ManageBooking right after a successful move, which
    // lands here on the new token; otherwise the page looks the same as
    // before and the client can't tell the move happened.
    // ?created=1 - set by submitBooking/submitGroupBooking, which land here
    // right after booking (this page is the confirmation; there's no
    // separate one keyed by booking id that would work as a second,
    // never-expiring magic link).
    searchParams: Promise<{ moved?: string; created?: string }>;
}) {
    const { token } = await params;
    const { moved, created } = await searchParams;
    const bookings = await getBookingGroupByToken(token);
    if (!bookings) notFound();

    const booking = bookings[0];
    const dateSummary = format(booking.date, "d. MMMM yyyy", { locale: cs });
    const timeSummary = `${formatTime(booking.startTime)} – ${formatTime(bookings.at(-1)!.endTime)}`;

    if (booking.status === "CANCELLED") {
        // A move cancels the old booking too - its old link (still in the
        // client's inbox) must not claim the visit is off.
        const movedGroup = await findMovedBookingGroup(booking.id);
        if (movedGroup) {
            const moved = movedGroup[0];
            return (
                <CzechText>
                    <div className="mx-auto max-w-md text-center">
                        <ArrowRightLeft className="mx-auto mb-2 size-10 text-primary" />
                        <h2 className="mb-2">Rezervace přesunuta</h2>
                        <p className="text-sm text-muted-foreground">
                            Nový termín je{" "}
                            <span className="text-foreground">
                                {format(moved.date, "d. MMMM yyyy", {
                                    locale: cs,
                                })}{" "}
                                v {formatTime(moved.startTime)}–
                                {formatTime(movedGroup.at(-1)!.endTime)}
                            </span>
                            .
                        </p>
                        {moved.client.email && (
                            <p className="mt-2 text-sm text-muted-foreground">
                                Nový odkaz pro správu rezervace jsme Vám poslali
                                e-mailem.
                            </p>
                        )}
                    </div>
                </CzechText>
            );
        }

        return (
            <CzechText>
                <div className="mx-auto max-w-md text-center">
                    <XCircle className="mx-auto mb-2 size-10 text-muted-foreground" />
                    <h2 className="mb-2">Rezervace zrušena</h2>
                    <p className="mb-6 text-sm text-muted-foreground">
                        Tato rezervace byla zrušena.
                    </p>
                    <Button asChild>
                        <Link href="/rezervace">
                            <Plus className="size-4" />
                            Vytvořit novou rezervaci
                        </Link>
                    </Button>
                </div>
            </CzechText>
        );
    }

    const canModify = canClientModifyBooking(booking.date, booking.startTime);
    const durationMinutes = bookings.at(-1)!.endTime - booking.startTime;
    const totalPrice = bookings.reduce((sum, b) => sum + b.service.price, 0);

    return (
        <CzechText>
            <div className="group/manage mx-auto max-w-md">
                <h2 className="mb-4">Vaše rezervace</h2>
                {created && <ClearBookingDraft />}
                {created && (
                    <Alert
                        variant="success"
                        className="mb-4 group-has-[[data-moving]]/manage:hidden"
                    >
                        <CheckCircle2 />
                        <AlertTitle>Rezervace potvrzena</AlertTitle>
                        <AlertDescription className="text-muted-foreground!">
                            {booking.client.email &&
                                `Potvrzení s odkazem na tuto stránku jsme Vám poslali na ${booking.client.email}. `}
                            Ráno v den rezervace Vám pošleme SMS připomínku.
                        </AlertDescription>
                    </Alert>
                )}
                {moved && (
                    <Alert
                        variant="success"
                        className="mb-4 group-has-[[data-moving]]/manage:hidden"
                    >
                        <CheckCircle2 />
                        <AlertTitle>Rezervace přesunuta</AlertTitle>
                        {booking.client.email && (
                            <AlertDescription className="text-muted-foreground!">
                                Potvrzení a odkaz pro správu rezervace jsme Vám
                                poslali e-mailem.
                            </AlertDescription>
                        )}
                    </Alert>
                )}
                <Card>
                    <CardContent className="flex flex-col gap-2 text-sm">
                        {bookings.map((b) => (
                            <div
                                key={b.id}
                                className="flex items-center gap-2"
                            >
                                <UserRound className="size-4 shrink-0 text-muted-foreground" />
                                <span>
                                    {getBookingPersonName(b)}{" "}
                                    <span className="text-muted-foreground">
                                        · {b.service.name}
                                    </span>
                                </span>
                            </div>
                        ))}
                        <div className="flex items-center gap-2">
                            <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
                            {dateSummary}
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="size-4 shrink-0 text-muted-foreground" />
                            {timeSummary}
                        </div>
                        <div className="flex items-center gap-2">
                            <MapPin className="size-4 shrink-0 text-muted-foreground" />
                            <a
                                href={BUSINESS_INFO.mapsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline decoration-border underline-offset-2 transition-colors hover:text-primary"
                            >
                                {BUSINESS_INFO.address.street},{" "}
                                {BUSINESS_INFO.address.city}
                            </a>
                        </div>
                        <div className="flex items-center gap-2">
                            <Banknote className="size-4 shrink-0 text-muted-foreground" />
                            Celkem {totalPrice.toLocaleString("cs-CZ")} Kč
                        </div>
                    </CardContent>
                </Card>

                <Button
                    asChild
                    size="lg"
                    // Hidden while picking a new time - saving the old one to
                    // the calendar right then would be the wrong move.
                    className="mt-4 w-full group-has-[[data-moving]]/manage:hidden"
                >
                    {/* Plain <a>, not <Link>: a file download, not a page. */}
                    <a href={`/rezervace/sprava/${token}/kalendar`}>
                        <CalendarPlus />
                        Přidat do kalendáře
                    </a>
                </Button>

                {canModify ? (
                    <ManageBooking
                        token={token}
                        serviceLabel={bookings
                            .map((b) => b.service.name)
                            .join(" · ")}
                        dateLabel={dateSummary}
                        startTime={booking.startTime}
                        durationMinutes={durationMinutes}
                    />
                ) : (
                    <p className="mt-8 text-sm text-muted-foreground">
                        Do termínu zbývá méně než 24 hodin, změnu nebo zrušení
                        proto prosím domluvte telefonicky na{" "}
                        <a
                            href={`tel:${BUSINESS_INFO.phone}`}
                            className="whitespace-nowrap text-foreground underline underline-offset-2"
                        >
                            {BUSINESS_INFO.phoneDisplay}
                        </a>
                        .
                    </p>
                )}

                {created && (
                    <Link
                        href="/"
                        className="mt-8 inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                        <ArrowLeft className="size-4" />
                        Zpět na web
                    </Link>
                )}
            </div>
        </CzechText>
    );
}
