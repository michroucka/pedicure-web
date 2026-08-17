import { prisma } from "@/lib/prisma.ts"
import { getAvailableSlots } from "@/lib/get-available-slots.ts"
import { Service } from "@/lib/generated/prisma/client"
import { ReservationFilters } from "@/components/reservation-filters.tsx"
import { formatTime } from "@/lib/utils.ts"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
    Field,
    FieldGroup,
    FieldLabel,
    FieldLegend,
    FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { submitBooking } from "@/app/reservation/actions.ts"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx"
import { AlertCircle } from "lucide-react"


export default async function ReservationPage({ searchParams }: {
    searchParams: Promise<{ date?: string; service?: string; slot?: string; error?: string }>
}) {
    const { date, service, slot, error } = await searchParams;
    
    const services: Service[] = await prisma.service.findMany({ where: { active: true } });
    const availableSlots: number[] = date && service ? await getAvailableSlots(new Date(date), service) : [];

    return (
        <div>
            <ReservationFilters services={services} />

            {availableSlots.map((s) => {
                const params = new URLSearchParams({
                    date: date!,
                    service: service!,
                    slot: String(s),
                })
                return (
                    <Link
                        key={s}
                        href={`/reservation?${params.toString()}`}
                        className="me-2"
                    >
                        {formatTime(s)}
                    </Link>
                )
            })}

            {slot && service && date && (
                <div className="m-8 w-full max-w-md">
                    {(() => {
                        const boundSubmit = submitBooking.bind(null, {
                            date: new Date(date),
                            serviceId: service,
                            startTime: Number(slot),
                        })
                        return (
                            <form action={boundSubmit}>
                                <FieldGroup>
                                    <FieldSet>
                                        <FieldLegend>
                                            Kontaktní údaje
                                        </FieldLegend>
                                        <FieldGroup>
                                            <Field>
                                                <FieldLabel htmlFor="name">
                                                    Jméno a Příjmení
                                                </FieldLabel>
                                                <Input
                                                    id="name"
                                                    name="name"
                                                    placeholder={
                                                        "Jana Nováková"
                                                    }
                                                    required
                                                />
                                            </Field>
                                            <Field>
                                                <FieldLabel htmlFor="phone">
                                                    Telefon
                                                </FieldLabel>
                                                <Input
                                                    id="phone"
                                                    name="phone"
                                                    type="tel"
                                                    inputMode="tel"
                                                    pattern="[0-9+ ]{9,15}"
                                                    placeholder="+420 123 456 789"
                                                    required
                                                />
                                            </Field>
                                            <Field>
                                                <FieldLabel htmlFor="email">
                                                    Email
                                                </FieldLabel>
                                                <Input
                                                    id="email"
                                                    name="email"
                                                    type="email"
                                                    placeholder="jana.novakova@seznam.cz"
                                                    required
                                                />
                                            </Field>
                                        </FieldGroup>
                                    </FieldSet>
                                    <Field orientation="horizontal">
                                        <Button
                                            type="submit"
                                            disabled={error === "slot_taken"}
                                        >
                                            Submit
                                        </Button>
                                        <Button variant="outline" type="button">
                                            Cancel
                                        </Button>
                                    </Field>
                                </FieldGroup>
                            </form>
                        )
                    })()}
                </div>
            )}

            {error === "slot_taken" && (
                <Alert
                    className="max-w-md border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-50"
                >
                    <AlertCircle />
                    <AlertTitle>Termín již není volný</AlertTitle>
                    <AlertDescription>
                        Tento termín je již obsazený. Vyberte prosím jiný čas.
                    </AlertDescription>
                </Alert>
            )}
        </div>
    )
}