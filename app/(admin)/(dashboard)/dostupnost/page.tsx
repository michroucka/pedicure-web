import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { addUtcDays, formatTime, getCzechToday } from "@/lib/utils";
import { AvailabilityForm } from "@/components/admin/availability-form";
import { ExceptionForm } from "@/components/admin/exception-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarClock, Repeat } from "lucide-react";
import { saveRecurringAvailability } from "./actions";

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
            where: { date: { gte: addUtcDays(getCzechToday(), -14) } },
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
        <div className="mx-auto max-w-lg p-4 lg:max-w-3xl">
            {/* overflow-visible: a clipping Card would break the sticky
                save bar inside it. */}
            <Card className="overflow-visible">
                <CardContent>
                    {/* Both tabs stay mounted, so unsaved changes survive switching
                to the other tab and back. */}
                    <Tabs defaultValue="exceptions">
                        <TabsList className="mb-4 h-auto! w-full max-w-md gap-1 self-center rounded-full p-1">
                            <TabsTrigger
                                value="exceptions"
                                className="h-10 rounded-full py-2 text-base text-muted-foreground hover:text-foreground active:translate-y-px active:scale-[0.97] data-active:text-foreground data-active:shadow-sm"
                            >
                                <CalendarClock className="size-4" />
                                Úprava dne
                            </TabsTrigger>
                            <TabsTrigger
                                value="recurring"
                                className="h-10 rounded-full py-2 text-base text-muted-foreground hover:text-foreground active:translate-y-px active:scale-[0.97] data-active:text-foreground data-active:shadow-sm"
                            >
                                <Repeat className="size-4" />
                                Stálá dostupnost
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent
                            value="exceptions"
                            forceMount
                            className="data-[state=inactive]:hidden"
                        >
                            <ExceptionForm
                                exceptions={exceptions}
                                recurring={recurring}
                            />
                        </TabsContent>

                        <TabsContent
                            value="recurring"
                            forceMount
                            className="data-[state=inactive]:hidden"
                        >
                            <AvailabilityForm
                                days={days}
                                saveAction={saveRecurringAvailability}
                            />
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
