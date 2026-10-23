-- The partial unique index on (date, startTime) only catches two bookings
-- with the exact same start. Two concurrent requests for overlapping but
-- different times (10:00-11:00 and 10:30-11:00) both passed the
-- application-level availability check. This makes the database reject
-- any overlap among CONFIRMED bookings on the same date.
-- btree_gist lets a GiST index combine plain equality (date) with range
-- overlap (&&). Prisma can't express this, so it lives here only.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Booking"
    ADD CONSTRAINT "Booking_no_overlap"
    EXCLUDE USING gist (
        "date" WITH =,
        int4range("startTime", "endTime") WITH &&
    )
    WHERE ("status" = 'CONFIRMED');
