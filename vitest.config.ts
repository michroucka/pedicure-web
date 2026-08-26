import { defineConfig } from "vitest/config";

export default defineConfig({
    resolve: {
        alias: {
            "@": import.meta.dirname,
        },
    },
    test: {
        // DB integration tests share one Neon "test" branch, and some
        // globally-scoped tables (RecurringAvailability has only dayOfWeek,
        // no date) leave just 7 possible values to divide across test
        // files. Running files in parallel turned that into a recurring
        // source of flaky cross-file collisions — sequential files trade a
        // bit of speed for not having to hand out day-of-week slots forever.
        fileParallelism: false,
    },
});
