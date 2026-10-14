import { z } from "zod";

// cancelToken is crypto.randomUUID() (lib/create-booking.ts). Anything else
// can't match a booking — reject it before it reaches the Prisma query.
export const tokenSchema = z.uuid();
