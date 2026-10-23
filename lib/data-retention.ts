import type { BookingStatus } from "@/lib/generated/prisma/enums.ts";

// How long client records are kept after their last visit. Matches the
// general 3-year limitation period (§ 629 OZ), so a claim can still be backed
// by the booking history. Stated in the privacy policy – change both together
// (and mind the Czech plural there: 2–4 "roky", 5+ "let").
export const CLIENT_RETENTION_YEARS = 3;

// Nightly encrypted DB backups (pedicure-db-backup repo) keep artifacts this
// long, so deleted data disappears from backups within this window too.
export const BACKUP_RETENTION_DAYS = 30;

export type RetentionClient = {
    id: string;
    createdAt: Date;
    bookings: { date: Date; status: BookingStatus; createdAt: Date }[];
};

// Clients whose data the privacy policy says must be gone by now: no visit in
// the last CLIENT_RETENTION_YEARS. `today` is a UTC-midnight date
// (getCzechToday()), same convention as Booking.date.
//
// - Last visit = the latest CONFIRMED booking dated before today.
// - Any CONFIRMED booking today or later keeps the client, whatever the
//   history – they're still an active client.
// - No visit at all (only cancelled bookings, or created by hand without one):
//   counted from the latest contact instead – client creation or any booking
//   being made – so someone who booked and cancelled last month isn't deleted
//   just because their Client row is old.
export function getExpiredClientIds(
    clients: RetentionClient[],
    today: Date
): string[] {
    const cutoff = new Date(
        Date.UTC(
            today.getUTCFullYear() - CLIENT_RETENTION_YEARS,
            today.getUTCMonth(),
            today.getUTCDate()
        )
    );

    return clients
        .filter((client) => {
            const confirmed = client.bookings.filter(
                (b) => b.status === "CONFIRMED"
            );
            if (confirmed.some((b) => b.date >= today)) return false;

            const lastActivity =
                confirmed.length > 0
                    ? latest(confirmed.map((b) => b.date))
                    : latest([
                          client.createdAt,
                          ...client.bookings.map((b) => b.createdAt),
                      ]);

            return lastActivity < cutoff;
        })
        .map((client) => client.id);
}

function latest(dates: Date[]): Date {
    return new Date(Math.max(...dates.map((d) => d.getTime())));
}
