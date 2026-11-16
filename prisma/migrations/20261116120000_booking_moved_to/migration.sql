-- A move cancels the old booking and creates a new one; movedToId links
-- the two so the old magic link can show the new time instead of
-- "cancelled".
-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "movedToId" TEXT;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_movedToId_fkey" FOREIGN KEY ("movedToId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

