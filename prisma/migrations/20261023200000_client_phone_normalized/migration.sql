-- Generated column: Postgres computes it from "phone" on every write, so it
-- can't go stale (a script or Prisma Studio edit that forgets it, or the old
-- app version still running during a deploy). Prisma doesn't know generated
-- columns – the field is in schema.prisma for reading only, never write it.
-- Same rule as normalizePhoneForMatch (lib/utils.ts): digits only, leading
-- Czech country code 420 stripped when longer than 9 digits.
-- lib/client-phone-normalized.test.ts checks the two stay in sync.
ALTER TABLE "Client" ADD COLUMN "phoneNormalized" TEXT GENERATED ALWAYS AS (
    CASE
        WHEN regexp_replace("phone", '\D', '', 'g') LIKE '420%'
            AND length(regexp_replace("phone", '\D', '', 'g')) > 9
            THEN substring(regexp_replace("phone", '\D', '', 'g') FROM 4)
        ELSE regexp_replace("phone", '\D', '', 'g')
    END
) STORED;

-- CreateIndex
CREATE INDEX "Client_phoneNormalized_idx" ON "Client"("phoneNormalized");

-- CreateIndex
CREATE INDEX "Booking_clientId_idx" ON "Booking"("clientId");

-- CreateIndex
CREATE INDEX "Booking_groupId_idx" ON "Booking"("groupId");
