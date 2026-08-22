"use client";

import { useEffect, useState } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { groupSchema } from "@/app/reservation/schema.ts";
import { getExtraMinutesAction } from "@/app/reservation/actions.ts";
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
    FieldDescription,
} from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { PhoneInput } from "@/components/phone-input.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert.tsx";
import {
    BellRing,
    Check,
    ChevronLeft,
    Info,
    Mail,
    Phone,
    UserRound,
    UsersRound,
} from "lucide-react";
import Link from "next/link";
import { formatTime } from "@/lib/utils.ts";

type GroupFormData = z.infer<typeof groupSchema>;

export function GroupBookingForm({
    boundSubmitAction,
    serviceNames,
    backHref,
    startTime,
    durationMinutes,
    initialExtraMinutes = 0,
}: {
    boundSubmitAction: (data: GroupFormData) => Promise<void>;
    serviceNames: string[];
    backHref: string;
    startTime: number;
    durationMinutes: number;
    initialExtraMinutes?: number;
}) {
    const {
        register,
        handleSubmit,
        control,
        formState: { errors },
    } = useForm<GroupFormData>({
        resolver: zodResolver(groupSchema),
        mode: "onChange",
        defaultValues: { reminderRequested: false },
    });

    const names = useWatch({ control, name: "names" });
    const phone = useWatch({ control, name: "phone" });
    const [extraMinutes, setExtraMinutes] = useState(initialExtraMinutes);

    // Extra time is tied to an existing (name, phone) client match per
    // person, only knowable once names + phone are filled in — look it up
    // as the user types instead of surprising them after submit.
    useEffect(() => {
        let cancelled = false;
        const timeout = setTimeout(() => {
            const entries = (names ?? [])
                .filter((n): n is string => !!n?.trim())
                .map((n) => ({ name: n, phone: phone ?? "" }));
            if (entries.length === 0 || !phone?.trim()) {
                if (!cancelled) setExtraMinutes(0);
                return;
            }
            getExtraMinutesAction(entries).then((minutes) => {
                if (!cancelled) setExtraMinutes(minutes);
            });
        }, 400);
        return () => {
            cancelled = true;
            clearTimeout(timeout);
        };
    }, [names, phone]);

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

            {extraMinutes > 0 && extraMinutes !== initialExtraMinutes && (
                <Alert
                    variant="info"
                    className="mt-4"
                >
                    <Info />
                    <AlertTitle>Delší rezervace</AlertTitle>
                    <AlertDescription>
                        Podle předchozích návštěv počítáme s časem navíc —
                        rezervace bude do{" "}
                        {formatTime(startTime + durationMinutes + extraMinutes)}{" "}
                        (místo {formatTime(startTime + durationMinutes)}).
                    </AlertDescription>
                </Alert>
            )}

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
                            Ranní připomínka
                        </FieldTitle>
                        <FieldDescription>
                            Pošleme e-mailem ráno v den rezervace.
                        </FieldDescription>
                    </FieldContent>
                </Field>
            </FieldLabel>

            <div className="flex justify-between">
                <Button
                    variant="outline"
                    size="lg"
                    type="button"
                    asChild
                >
                    <Link href={backHref}>
                        <ChevronLeft className="size-4" />
                        Zpět
                    </Link>
                </Button>
                <Button
                    type="submit"
                    size="lg"
                >
                    <Check className="size-4" />
                    Potvrdit rezervaci
                </Button>
            </div>
        </form>
    );
}
