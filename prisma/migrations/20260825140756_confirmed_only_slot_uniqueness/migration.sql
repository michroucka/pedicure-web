-- The plain unique index on (date, startTime) also applied to CANCELLED
-- rows, so a cancelled booking permanently blocked that slot from ever
-- being booked again. Replaced with a partial unique index that only
-- enforces uniqueness among CONFIRMED bookings.
DROP INDEX "Booking_date_startTime_key";

CREATE UNIQUE INDEX "Booking_date_startTime_confirmed_key" ON "Booking"("date", "startTime") WHERE "status" = 'CONFIRMED';
