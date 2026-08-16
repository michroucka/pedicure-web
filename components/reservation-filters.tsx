"use client"

import { Service } from "@/lib/generated/prisma/client.ts"
import { useRouter } from "next/navigation"
import { usePathname, useSearchParams } from "next/navigation"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button.tsx"
import { ChevronDownIcon } from "lucide-react"
import { Calendar } from "@/components/ui/calendar.tsx"
import {
    Select,
    SelectValue,
    SelectTrigger,
    SelectLabel,
    SelectItem,
    SelectContent,
    SelectGroup,
} from "@/components/ui/select"
import { format } from "date-fns"
import { cs } from "date-fns/locale"

export function ReservationFilters({ services }: { services: Service[] }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const dateParam = searchParams.get("date");
    const date = dateParam ? new Date(dateParam) : undefined;

    const serviceParam = searchParams.get("service") ?? undefined;

    function updateParam(key: string, value: string) {
        const params = new URLSearchParams(searchParams);
        params.set(key, value);
        router.push(`${pathname}?${params.toString()}`);
    }

    return (
        <div>
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        data-empty={!date}
                        className="w-53 justify-between text-left font-normal data-[empty=true]:text-muted-foreground"
                    >
                        {date ? (
                            format(date, "d. MMMM yyyy", { locale: cs })
                        ) : (
                            <span>Vyberte datum</span>
                        )}
                        <ChevronDownIcon />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="single"
                        locale={cs}
                        selected={date}
                        onSelect={(d) => d && updateParam("date", format(d, "yyyy-MM-dd"))}
                        defaultMonth={date}
                    />
                </PopoverContent>
            </Popover>

            <Select
                onValueChange={(v) => v && updateParam("service", v)}
                defaultValue={serviceParam}
            >
                <SelectTrigger className="w-full max-w-48">
                    <SelectValue placeholder="Vyberte službu" />
                </SelectTrigger>
                <SelectContent>
                    <SelectGroup>
                        <SelectLabel>Služby</SelectLabel>
                        {services.map((s) => (
                            <SelectItem value={s.id} key={s.id}>
                                {s.name}
                            </SelectItem>
                        ))}
                    </SelectGroup>
                </SelectContent>
            </Select>
        </div>
    )
}