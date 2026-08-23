// Booking is off at launch — RecurringAvailability has no valid slots
// configured yet, so letting people through to /rezervace would just let
// them fail to book. Flip to true once real availability is set up; that
// re-enables the /rezervace route (see proxy.ts) and brings back every
// "Objednat se" CTA across the marketing pages.
export const BOOKING_ENABLED = false;
