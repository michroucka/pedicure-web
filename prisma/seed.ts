import "dotenv/config";
import { prisma } from "../lib/prisma.ts";

const MONDAY = 1;
const FRIDAY = 5;
const WORK_DAY_START = 9 * 60; // 9:00
const WORK_DAY_END = 17 * 60; // 17:00

async function seedServices() {
    const count = await prisma.service.count();
    if (count > 0) {
        console.log("Services already seeded, skipping.");
        return;
    }

    await prisma.service.createMany({
        data: [
            {
                name: "Expresní pedikúra",
                durationMinutes: 30,
                price: 350,
                description: "Rychlé ošetření pro pravidelné klienty.",
            },
            {
                name: "Klasická pedikúra",
                durationMinutes: 45,
                price: 500,
                description: "Standardní kompletní ošetření.",
            },
            {
                name: "Pedikúra s lakováním",
                durationMinutes: 60,
                price: 650,
                description: "Kompletní ošetření včetně lakování nehtů.",
            },
        ],
    });

    console.log("Seeded services.");
}

async function seedRecurringAvailability() {
    const count = await prisma.recurringAvailability.count();
    if (count > 0) {
        console.log("Recurring availability already seeded, skipping.");
        return;
    }

    const data = [];
    for (let dayOfWeek = MONDAY; dayOfWeek <= FRIDAY; dayOfWeek++) {
        data.push({
            dayOfWeek,
            startTime: WORK_DAY_START,
            endTime: WORK_DAY_END,
        });
    }

    await prisma.recurringAvailability.createMany({ data });

    console.log("Seeded recurring availability.");
}

async function main() {
    await seedServices();
    await seedRecurringAvailability();
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
