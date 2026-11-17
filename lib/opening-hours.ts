import { prisma } from "@/lib/prisma";

type RecurringBlock = { dayOfWeek: number; startTime: number; endTime: number };

// hours: one entry per block of the day, e.g. ["8:00–12:00", "13:00–16:00"].
export type OpeningHoursRow = { days: string; hours: string[] };

// dayOfWeek is Date.getUTCDay() (0 = Sunday); the week is listed from Monday.
const WEEK_FROM_MONDAY = [1, 2, 3, 4, 5, 6, 0];
const DAY_ABBREVIATIONS = ["Ne", "Po", "Út", "St", "Čt", "Pá", "So"];

// "8:00", not "08:00" – reads better in running text than the admin's
// fixed-width times.
function formatHour(minutes: number) {
    return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
}

// The usual week from the recurring availability: consecutive days with the
// same blocks share a row ("Po–Čt", ["8:00–12:00", "13:00–16:00"]), closed days
// are left out.
export function groupOpeningHours(blocks: RecurringBlock[]): OpeningHoursRow[] {
    const hoursByDay = WEEK_FROM_MONDAY.map((dayOfWeek) =>
        blocks
            .filter((block) => block.dayOfWeek === dayOfWeek)
            .toSorted((a, b) => a.startTime - b.startTime)
            .map(
                (block) =>
                    `${formatHour(block.startTime)}–${formatHour(block.endTime)}`
            )
    );
    const sameHours = (a: string[], b: string[]) => a.join() === b.join();

    const rows: OpeningHoursRow[] = [];
    let runStart = 0;
    for (let i = 1; i <= hoursByDay.length; i++) {
        if (
            i < hoursByDay.length &&
            sameHours(hoursByDay[i], hoursByDay[runStart])
        ) {
            continue;
        }
        const hours = hoursByDay[runStart];
        if (hours.length > 0) {
            const first = DAY_ABBREVIATIONS[WEEK_FROM_MONDAY[runStart]];
            const last = DAY_ABBREVIATIONS[WEEK_FROM_MONDAY[i - 1]];
            rows.push({
                days: i - 1 === runStart ? first : `${first}–${last}`,
                hours,
            });
        }
        runStart = i;
    }
    return rows;
}

export async function getOpeningHours() {
    const blocks = await prisma.recurringAvailability.findMany();
    return groupOpeningHours(blocks);
}
