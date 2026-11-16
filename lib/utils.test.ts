import { afterEach, describe, expect, it, vi } from "vitest";
import {
    addUtcDays,
    endsAfterMidnight,
    formatPhoneNumber,
    formatTime,
    getCzechNowMinutes,
    getCzechToday,
    normalizeForSearch,
    parseTime,
    roundToQuarterHour,
    startOfWeekUtc,
    toE164,
    toTelHref,
} from "./utils";

const utcDay = (year: number, month: number, day: number) =>
    new Date(Date.UTC(year, month - 1, day));

describe("Europe/Prague clock", () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    function at(iso: string) {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(iso));
    }

    it("rolls over to the next Czech day before UTC does (summer, UTC+2)", () => {
        at("2026-06-14T21:59:00.000Z");
        expect(getCzechToday()).toEqual(utcDay(2026, 6, 14));
        expect(getCzechNowMinutes()).toBe(23 * 60 + 59);

        at("2026-06-14T22:00:00.000Z");
        expect(getCzechToday()).toEqual(utcDay(2026, 6, 15));
        expect(getCzechNowMinutes()).toBe(0);
    });

    it("rolls over to the next Czech day before UTC does (winter, UTC+1)", () => {
        at("2026-12-31T22:59:00.000Z");
        expect(getCzechToday()).toEqual(utcDay(2026, 12, 31));
        expect(getCzechNowMinutes()).toBe(23 * 60 + 59);

        at("2026-12-31T23:00:00.000Z");
        expect(getCzechToday()).toEqual(utcDay(2027, 1, 1));
        expect(getCzechNowMinutes()).toBe(0);
    });

    it("reports midnight as 0, not 24*60", () => {
        at("2026-11-16T23:00:00.000Z");
        expect(getCzechNowMinutes()).toBe(0);
    });

    // 2026-10-25: clocks go back at 03:00 CEST -> 02:00 CET (01:00 UTC), so
    // 02:00-02:59 local happens twice.
    it("handles the autumn DST switch (2026-10-25)", () => {
        at("2026-10-24T21:59:00.000Z");
        expect(getCzechToday()).toEqual(utcDay(2026, 10, 24));

        at("2026-10-24T22:00:00.000Z");
        expect(getCzechToday()).toEqual(utcDay(2026, 10, 25));
        expect(getCzechNowMinutes()).toBe(0);

        at("2026-10-25T00:30:00.000Z");
        expect(getCzechNowMinutes()).toBe(2 * 60 + 30);

        at("2026-10-25T01:30:00.000Z");
        expect(getCzechNowMinutes()).toBe(2 * 60 + 30);

        at("2026-10-25T09:00:00.000Z");
        expect(getCzechNowMinutes()).toBe(10 * 60);

        // After the switch midnight is 23:00 UTC, not 22:00.
        at("2026-10-25T22:30:00.000Z");
        expect(getCzechToday()).toEqual(utcDay(2026, 10, 25));
        expect(getCzechNowMinutes()).toBe(23 * 60 + 30);

        at("2026-10-25T23:00:00.000Z");
        expect(getCzechToday()).toEqual(utcDay(2026, 10, 26));
    });

    // 2027-03-28: clocks go forward at 02:00 CET -> 03:00 CEST (01:00 UTC),
    // so 02:00-02:59 local never happens.
    it("handles the spring DST switch (2027-03-28)", () => {
        at("2027-03-27T22:59:00.000Z");
        expect(getCzechToday()).toEqual(utcDay(2027, 3, 27));

        at("2027-03-27T23:00:00.000Z");
        expect(getCzechToday()).toEqual(utcDay(2027, 3, 28));
        expect(getCzechNowMinutes()).toBe(0);

        at("2027-03-28T00:59:00.000Z");
        expect(getCzechNowMinutes()).toBe(1 * 60 + 59);

        at("2027-03-28T01:00:00.000Z");
        expect(getCzechNowMinutes()).toBe(3 * 60);

        at("2027-03-28T21:59:00.000Z");
        expect(getCzechToday()).toEqual(utcDay(2027, 3, 28));

        at("2027-03-28T22:00:00.000Z");
        expect(getCzechToday()).toEqual(utcDay(2027, 3, 29));
    });

    it("returns a UTC-midnight date", () => {
        at("2026-06-15T12:34:56.789Z");
        const today = getCzechToday();
        expect(today.toISOString()).toBe("2026-06-15T00:00:00.000Z");
    });
});

describe("addUtcDays", () => {
    it("adds and subtracts whole days", () => {
        expect(addUtcDays(utcDay(2026, 6, 15), 1)).toEqual(utcDay(2026, 6, 16));
        expect(addUtcDays(utcDay(2026, 6, 15), -15)).toEqual(
            utcDay(2026, 5, 31)
        );
        expect(addUtcDays(utcDay(2026, 12, 31), 1)).toEqual(utcDay(2027, 1, 1));
    });

    it("stays at UTC midnight across a Czech DST switch", () => {
        expect(addUtcDays(utcDay(2026, 10, 24), 2)).toEqual(
            utcDay(2026, 10, 26)
        );
        expect(addUtcDays(utcDay(2027, 3, 27), 2)).toEqual(utcDay(2027, 3, 29));
    });
});

describe("startOfWeekUtc", () => {
    it("returns Monday for every day of the week", () => {
        const monday = utcDay(2026, 11, 16);
        for (let offset = 0; offset < 7; offset++) {
            expect(startOfWeekUtc(addUtcDays(monday, offset))).toEqual(monday);
        }
    });

    it("maps Sunday back to the previous Monday", () => {
        expect(startOfWeekUtc(utcDay(2026, 11, 22))).toEqual(
            utcDay(2026, 11, 16)
        );
    });

    it("crosses month and year boundaries", () => {
        expect(startOfWeekUtc(utcDay(2027, 1, 1))).toEqual(
            utcDay(2026, 12, 28)
        );
    });

    it("works for the week containing the autumn DST switch", () => {
        expect(startOfWeekUtc(utcDay(2026, 10, 25))).toEqual(
            utcDay(2026, 10, 19)
        );
    });
});

describe("endsAfterMidnight", () => {
    it("allows ending exactly at 24:00", () => {
        expect(endsAfterMidnight(23 * 60, 60)).toBe(false);
    });

    it("rejects ending past 24:00", () => {
        expect(endsAfterMidnight(23 * 60, 61)).toBe(true);
        expect(endsAfterMidnight(23 * 60 + 30, 45)).toBe(true);
    });

    it("allows an ordinary daytime booking", () => {
        expect(endsAfterMidnight(9 * 60, 60)).toBe(false);
    });
});

describe("formatTime / parseTime", () => {
    it("formats minutes as zero-padded HH:MM", () => {
        expect(formatTime(0)).toBe("00:00");
        expect(formatTime(9 * 60 + 5)).toBe("09:05");
        expect(formatTime(23 * 60 + 59)).toBe("23:59");
        expect(formatTime(24 * 60)).toBe("24:00");
    });

    it("parses HH:MM into minutes", () => {
        expect(parseTime("00:00")).toBe(0);
        expect(parseTime("09:05")).toBe(545);
        expect(parseTime("9:05")).toBe(545);
        expect(parseTime("24:00")).toBe(1440);
    });

    it("round-trips", () => {
        for (const minutes of [0, 15, 545, 720, 1439]) {
            expect(parseTime(formatTime(minutes))).toBe(minutes);
        }
    });
});

describe("roundToQuarterHour", () => {
    it("rounds remainder 0-7 down and 8-14 up", () => {
        expect(roundToQuarterHour("09:00")).toBe("09:00");
        expect(roundToQuarterHour("09:07")).toBe("09:00");
        expect(roundToQuarterHour("09:08")).toBe("09:15");
        expect(roundToQuarterHour("09:14")).toBe("09:15");
        expect(roundToQuarterHour("09:52")).toBe("09:45");
        expect(roundToQuarterHour("09:53")).toBe("10:00");
    });

    // Current behavior: 23:53+ wraps to "00:00" rather than "24:00", so an
    // end time typed as 23:55 becomes the start of the day.
    it("wraps past midnight to 00:00", () => {
        expect(roundToQuarterHour("23:53")).toBe("00:00");
    });

    it("leaves non-HH:MM input untouched", () => {
        expect(roundToQuarterHour("")).toBe("");
        expect(roundToQuarterHour("9:07")).toBe("9:07");
        expect(roundToQuarterHour("09:07:00")).toBe("09:07:00");
    });
});

describe("formatPhoneNumber", () => {
    it("groups a local number by three and caps it at 9 digits", () => {
        expect(formatPhoneNumber("1")).toBe("1");
        expect(formatPhoneNumber("123")).toBe("123");
        expect(formatPhoneNumber("1234")).toBe("123 4");
        expect(formatPhoneNumber("123456")).toBe("123 456");
        expect(formatPhoneNumber("1234567")).toBe("123 456 7");
        expect(formatPhoneNumber("123456789")).toBe("123 456 789");
        expect(formatPhoneNumber("1234567890")).toBe("123 456 789");
    });

    it("keeps a leading + and caps it at 12 digits", () => {
        expect(formatPhoneNumber("+")).toBe("+");
        expect(formatPhoneNumber("+420")).toBe("+420");
        expect(formatPhoneNumber("+4201")).toBe("+420 1");
        expect(formatPhoneNumber("+420123456")).toBe("+420 123 456");
        expect(formatPhoneNumber("+420123456789")).toBe("+420 123 456 789");
        expect(formatPhoneNumber("+4201234567890")).toBe("+420 123 456 789");
    });

    it("strips non-digits and any + that isn't leading", () => {
        expect(formatPhoneNumber("(123) 456-789")).toBe("123 456 789");
        expect(formatPhoneNumber("123+456")).toBe("123 456");
        expect(formatPhoneNumber("+420+123")).toBe("+420 123");
        expect(formatPhoneNumber("abc")).toBe("");
    });
});

describe("toE164", () => {
    it("adds the Czech country code to a bare local number", () => {
        expect(toE164("123 456 789")).toBe("420123456789");
    });

    it("keeps an existing Czech country code", () => {
        expect(toE164("+420 123 456 789")).toBe("420123456789");
        expect(toE164("420123456789")).toBe("420123456789");
    });

    it("treats a 9-digit number starting with 420 as local", () => {
        expect(toE164("420 123 456")).toBe("420420123456");
    });

    // Current behavior, see report: the 00 international prefix and
    // non-Czech country codes are not recognized.
    it("prefixes 420 to anything else, including 00420 and foreign codes", () => {
        expect(toE164("00420123456789")).toBe("42000420123456789");
        expect(toE164("+421 912 345 678")).toBe("420421912345678");
    });
});

describe("toTelHref", () => {
    it("builds a tel: link in +E.164 form", () => {
        expect(toTelHref("123 456 789")).toBe("tel:+420123456789");
        expect(toTelHref("+420 123 456 789")).toBe("tel:+420123456789");
    });
});

describe("normalizeForSearch", () => {
    it("strips Czech diacritics and lowercases", () => {
        expect(normalizeForSearch("Čára")).toBe("cara");
        expect(normalizeForSearch("ŽLUŤOUČKÝ KŮŇ")).toBe("zlutoucky kun");
        expect(normalizeForSearch("Řeřicha Ěščřžýáíé")).toBe(
            "rericha escrzyaie"
        );
    });

    it("leaves plain ASCII lowercase", () => {
        expect(normalizeForSearch("Novak 42")).toBe("novak 42");
    });
});
