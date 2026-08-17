"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { groupSchema } from "@/app/reservation/schema.ts";
import {
    Field,
    FieldLabel,
    FieldError,
    FieldGroup,
    FieldLegend,
    FieldSet,
    FieldSeparator,
    FieldContent,
    FieldTitle,
} from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { PhoneInput } from "@/components/phone-input.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import {
    BellRing,
    Check,
    ChevronLeft,
    Mail,
    Phone,
    UserRound,
    UsersRound,
} from "lucide-react";
import Link from "next/link";

type GroupFormData = z.infer<typeof groupSchema>;

export function GroupBookingForm({
    boundSubmitAction,
    serviceNames,
    backHref,
}: {
    boundSubmitAction: (data: GroupFormData) => Promise<void>;
    serviceNames: string[];
    backHref: string;
}) {
    const {
        register,
        handleSubmit,
        control,
        formState: { errors },
    } = useForm<GroupFormData>({
        resolver: zodResolver(groupSchema),
        mode: "onChange",
    });

    return (
        <form onSubmit={handleSubmit(boundSubmitAction)}>
            <FieldGroup>
                <FieldSet>
                    <FieldLegend>
                        Hlavní kontakt{" "}
                        <span className="text-sm text-muted-foreground">{`(${serviceNames[0]})`}</span>
                    </FieldLegend>
                    <FieldGroup>
                        <Field>
                            <FieldLabel htmlFor="name">
                                <UserRound className="size-4" />
                                Jméno
                            </FieldLabel>
                            <Input
                                id="name"
                                placeholder="Jana Nováková"
                                {...register("names.0")}
                            />
                            <FieldError errors={[errors.names?.[0]]} />
                        </Field>

                        <Field>
                            <FieldLabel htmlFor="phone">
                                <Phone className="size-4" />
                                Telefon
                            </FieldLabel>
                            <PhoneInput
                                id="phone"
                                placeholder="+420 123 456 789"
                                {...register("phone")}
                            />
                            <FieldError errors={[errors.phone]} />
                        </Field>

                        <Field>
                            <FieldLabel htmlFor="email">
                                <Mail className="size-4" />
                                Email
                            </FieldLabel>
                            <Input
                                id="email"
                                type="email"
                                placeholder="jana.novakova@seznam.cz"
                                {...register("email")}
                            />
                            <FieldError errors={[errors.email]} />
                        </Field>
                    </FieldGroup>
                </FieldSet>
                <FieldSeparator />
                <FieldSet>
                    <FieldLegend>Další osoby ve skupině</FieldLegend>
                    <FieldGroup>
                        {serviceNames.slice(1).map((serviceName, i) => {
                            const personIndex = i + 1;
                            return (
                                <Field key={personIndex}>
                                    <FieldLabel
                                        htmlFor={`names.${personIndex}`}
                                    >
                                        <UsersRound className="size-4" />
                                        {`Osoba ${personIndex + 1}`}
                                        <span className="self-end text-xs text-muted-foreground">{`(${serviceName})`}</span>
                                    </FieldLabel>
                                    <Input
                                        id={`names.${personIndex}`}
                                        placeholder="Jméno a příjmení"
                                        {...register(`names.${personIndex}`)}
                                    />
                                    <FieldError
                                        errors={[errors.names?.[personIndex]]}
                                    />
                                </Field>
                            );
                        })}
                    </FieldGroup>
                </FieldSet>
            </FieldGroup>

            <FieldLabel
                htmlFor="reminderRequested"
                className="my-6"
            >
                <Field orientation="horizontal">
                    <Controller
                        name="reminderRequested"
                        control={control}
                        render={({ field }) => (
                            <Checkbox
                                id="reminderRequested"
                                checked={field.value}
                                onCheckedChange={field.onChange}
                            />
                        )}
                    />
                    <FieldContent>
                        <FieldTitle>
                            <BellRing className="size-4" />
                            Poslat ráno v den rezervace e-mailem připomínku
                        </FieldTitle>
                    </FieldContent>
                </Field>
            </FieldLabel>

            <div className="flex justify-between">
                <Button
                    variant="outline"
                    type="button"
                    asChild
                >
                    <Link href={backHref}>
                        <ChevronLeft className="size-4" />
                        Zpět
                    </Link>
                </Button>
                <Button type="submit">
                    <Check className="size-4" />
                    Potvrdit rezervaci
                </Button>
            </div>
        </form>
    );
}
