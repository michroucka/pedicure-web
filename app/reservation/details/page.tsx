import { redirect } from "next/navigation";
import { submitBooking, submitGroupBooking } from "@/app/reservation/actions.ts";
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { PhoneInput } from "@/components/phone-input.tsx";
import { Button } from "@/components/ui/button.tsx";


export default async function DetailsPage({ searchParams }: {
    searchParams: Promise<{
        date?: string;
        services?: string;
        slot?: string;
    }>;
}) {
    const { date, services, slot } = await searchParams;
    const serviceIds = services?.split(",").filter(Boolean).map(Number) ?? [];

    if (!date || serviceIds.length === 0 || !slot) {
        redirect("/reservation");
    }

    const boundSubmit = serviceIds.length === 1
            ? submitBooking.bind(null, { date: new Date(date), serviceId: serviceIds[0], startTime: Number(slot) })
            : submitGroupBooking.bind(null, { date: new Date(date), serviceIds, startTime: Number(slot) });

    return (
        <div className="m-8 w-full max-w-md">
            <form action={boundSubmit}>
                <FieldGroup>
                    <FieldSet>
                        <FieldLegend>Kontaktní údaje</FieldLegend>
                        {serviceIds.length > 1 && (
                            <FieldLabel htmlFor="name-group">
                                Jméno a Příjmení
                            </FieldLabel>
                        )}
                        <FieldGroup id="name-group">
                            {serviceIds.map((_, i) => (
                                <Field key={i}>
                                    <FieldLabel htmlFor={`name-${i}`}>
                                        {serviceIds.length === 1
                                            ? "Jméno a Příjmení"
                                            : `Osoba ${i + 1}`}
                                    </FieldLabel>
                                    <Input
                                        id={`name-${i}`}
                                        name={`name-${i}`}
                                        placeholder={"Jana Nováková"}
                                        required
                                    />
                                </Field>
                            ))}
                            <Field>
                                <FieldLabel htmlFor="phone">Telefon</FieldLabel>
                                <PhoneInput
                                    id="phone"
                                    name="phone"
                                    type="tel"
                                    inputMode="tel"
                                    placeholder="+420 123 456 789"
                                    required
                                />
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="email">Email</FieldLabel>
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
                        >
                            Submit
                        </Button>
                        <Button
                            variant="outline"
                            type="button"
                        >
                            Cancel
                        </Button>
                    </Field>
                </FieldGroup>
            </form>
        </div>
    );
}
