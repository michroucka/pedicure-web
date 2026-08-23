import type { Metadata } from "next";
import { prisma } from "@/lib/prisma.ts";
import { formatTime, getCzechToday } from "@/lib/utils.ts";
import { AvailabilityForm } from "@/components/admin/availability-form.tsx";
import { ExceptionForm } from "@/components/admin/exception-form.tsx";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs.tsx";
import { CalendarX, Repeat } from "lucide-react";
import { saveRecurringAvailability } from "./actions.ts";

export const metadata: Metadata = {
    title: "Dostupnost",
};

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export default async function AvailabilityPage() {
    const [recurring, exceptions] = await Promise.all([
        prisma.recurringAvailability.findMany({
            orderBy: { startTime: "asc" },
        }),
        prisma.availabilityException.findMany({
            where: { date: { gte: getCzechToday() } },
            orderBy: { date: "asc" },
        }),
    ]);

    const days = DAY_ORDER.map((dayOfWeek) => ({
        dayOfWeek,
        blocks: recurring
            .filter((r) => r.dayOfWeek === dayOfWeek)
            .map((r) => ({
                startTime: formatTime(r.startTime),
                endTime: formatTime(r.endTime),
            })),
    }));

    return (
        <div className="mx-auto max-w-lg p-4">
            <Tabs defaultValue="exceptions">
                <TabsList className="mb-4 w-full">
                    <TabsTrigger
                        value="exceptions"
                        className="py-2 text-base"
                    >
                        <CalendarX className="size-4" />
                        Výjimky
                    </TabsTrigger>
                    <TabsTrigger
                        value="recurring"
                        className="py-2 text-base"
                    >
                        <Repeat className="size-4" />
                        Stálá dostupnost
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="exceptions">
                    <ExceptionForm exceptions={exceptions} />
                </TabsContent>

                <TabsContent value="recurring">
                    <AvailabilityForm
                        days={days}
                        saveAction={saveRecurringAvailability}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}
