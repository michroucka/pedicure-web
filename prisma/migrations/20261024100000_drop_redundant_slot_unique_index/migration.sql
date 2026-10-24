-- Booking_no_overlap (exclusion constraint) already rejects two CONFIRMED
-- bookings with the same start - same start means overlapping ranges. The
-- partial unique index on (date, startTime) only duplicated that check
-- with a second error code to handle.
DROP INDEX "Booking_date_startTime_confirmed_key";
