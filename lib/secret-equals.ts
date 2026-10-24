import { createHash, timingSafeEqual } from "crypto";

// Compares a request-supplied secret (cron bearer token, ICS feed token)
// without leaking through response timing how much of it was right.
// Hashing first gives timingSafeEqual equal-length inputs, so the length
// of the real secret doesn't leak either.
export function secretEquals(provided: string, expected: string): boolean {
    const digest = (value: string) => createHash("sha256").update(value).digest();
    return timingSafeEqual(digest(provided), digest(expected));
}
