import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma.ts";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { formatTime } from "@/lib/utils.ts";
import { StepIndicator } from "@/components/rezervace/step-indicator.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { BellRing, CalendarDays, CheckCircle2, Clock, Mail, UserRound } from "lucide-react";
import Link from "next/link";

export default async function ConfirmedPage({
    searchParams,
}: {
    searchParams: Promise<{ id?: string; groupId?: string; }>;
}) {
    const { id, groupId } = await searchParams;

    if (!id && !groupId) notFound();

    const bookings = await prisma.booking.findMany({
        where: { id, groupId },
        include: { client: true, service: true },
    });

    if (bookings.length === 0) notFound();

    const dateSummary = format(bookings[0].date, "d. MMMM yyyy", { locale: cs });
    const timeSummary = `${formatTime(bookings[0].startTime)} – ${formatTime(bookings.at(-1)!.endTime)}`;

    return (
        <div className="mx-auto max-w-md">
            <StepIndicator currentStep={3} />

            <div className="mb-6 flex flex-col items-center gap-2 text-center">
                <CheckCircle2 className="size-10 text-success-foreground" />
                <h2>Rezervace potvrzena</h2>
            </div>

            <Card>
                <CardContent className="flex flex-col gap-2 text-sm">
                    {bookings.map((booking) => (
                        <div
                            key={booking.id}
                            className="flex items-center gap-2"
                        >
                            <UserRound className="size-4 shrink-0 text-muted-foreground" />
                            {booking.client.name}
                            <span className="text-muted-foreground">
                                • {booking.service.name}
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

            <div className="mt-4 flex flex-col gap-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                    <Mail className="size-4 shrink-0" />
                    Potvrzovací e-mail jsme odeslali na{" "}
                    {bookings[0].client.email}.
                </div>
                {bookings[0].reminderRequested && (
                    <div className="flex items-center gap-2">
                        <BellRing className="size-4 shrink-0" />
                        Ráno v den rezervace Vám pošleme e-mailem připomínku.
                    </div>
                )}
            </div>

            <Button
                asChild
                className="mt-6 w-full"
            >
                <Link href="/">Zpět na hlavní stránku</Link>
            </Button>
        </div>
    );
}
