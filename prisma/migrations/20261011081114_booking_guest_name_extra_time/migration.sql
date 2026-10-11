-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "extraTimeMinutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "guestName" TEXT;

UPDATE "Booking" SET "extraTimeMinutes" = "Booking"."endTime" - "Booking"."startTime" - "Service"."durationMinutes"
    FROM "Service" WHERE "Booking"."serviceId" = "Service"."id";