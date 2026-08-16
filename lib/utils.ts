import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Normalizes a Date to UTC midnight for its calendar day. `Booking.date` /
// `AvailabilityException.date` are stored this way so exact-match DB
// queries (`where: { date } `) work without timezone drift.
export function toDateOnly(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  )
}

export function formatTime(time: number) {
    const hours = Math.floor(time / 60);
    const minutes = time % 60;

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}
