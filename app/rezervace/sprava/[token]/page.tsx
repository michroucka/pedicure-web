import { notFound } from "next/navigation";
import { getBookingGroupByToken } from "@/lib/get-booking-group-by-token.ts";
import { canClientModifyBooking } from "@/lib/booking-modification-window.ts";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { formatTime } from "@/lib/utils.ts";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { CalendarDays, Clock, Plus, UserRound, XCircle } from "lucide-react";
import { ManageBooking } from "@/components/rezervace/manage-booking.tsx";
import Link from "next/link";

export default async function SpravaPage({
    params,
}: {
    params: Promise<{ token: string }>;
}) {
    const { token } = await params;
    const bookings = await getBookingGroupByToken(token);
    if (!bookings) notFound();

    const booking = bookings[0];
    const dateSummary = format(booking.date, "d. MMMM yyyy", { locale: cs });
    const timeSummary = `${formatTime(booking.startTime)} – ${formatTime(bookings.at(-1)!.endTime)}`;

    if (booking.status === "CANCELLED") {
        return (
            <div className="mx-auto max-w-md text-center">
                <XCircle className="mx-auto mb-2 size-10 text-muted-foreground" />
                <h2 className="mb-2">Rezervace zrušena</h2>
                <p className="mb-6 text-sm text-muted-foreground">
                    Tato rezervace už byla zrušena.
                </p>
                <Button asChild>
                    <Link href="/rezervace">
                        <Plus className="size-4" />
                        Vytvořit novou rezervaci
                    </Link>
                </Button>
            </div>
        );
    }

    const canModify = canClientModifyBooking(booking.date, booking.startTime);
    const durationMinutes = bookings.at(-1)!.endTime - booking.startTime;

    return (
        <div className="mx-auto max-w-md">
            <h2 className="mb-4 text-center">Vaše rezervace</h2>
            <Card>
                <CardContent className="flex flex-col gap-2 text-sm">
                    {bookings.map((b) => (
                        <div
                            key={b.id}
                            className="flex items-center gap-2"
                        >
                            <UserRound className="size-4 shrink-0 text-muted-foreground" />
                            {b.client.name}
                            <span className="text-muted-foreground">
                                • {b.service.name}
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
                </CardContent>
            </Card>

            {canModify ? (
                <ManageBooking
                    token={token}
                    serviceLabel={bookings.map((b) => b.service.name).join(" • ")}
                    startTime={booking.startTime}
                    durationMinutes={durationMinutes}
                />
            ) : (
                <p className="mt-6 text-center text-sm text-muted-foreground">
                    Rezervaci už nelze online upravit (méně než 24 hodin do
                    termínu). V případě potřeby nás prosím kontaktujte
                    telefonicky.
                </p>
            )}
        </div>
    );
}
