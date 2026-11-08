import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { formatTime } from "@/lib/utils.ts";

export function formatPushDateTime(date: Date, startTime: number): string {
    return `${format(date, "d. MMMM yyyy", { locale: cs })} ${formatTime(startTime)}`;
}

export function adminCalendarUrl(date: Date): string {
    return `/kalendar?date=${date.toISOString().slice(0, 10)}`;
}
