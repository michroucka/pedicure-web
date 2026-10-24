"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { groupDataSchema } from "@/app/rezervace/schema.ts";
import {
    Field,
    FieldLabel,
    FieldError,
    FieldGroup,
    FieldLegend,
    FieldSet,
    FieldSeparator,
} from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { PhoneInput } from "@/components/phone-input.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert.tsx";
import {
    Check,
    ChevronLeft,
    Info,
    Mail,
    Phone,
    UserRound,
    UsersRound,
} from "lucide-react";
import Link from "next/link";
import { PrivacyNotice } from "@/components/rezervace/privacy-notice.tsx";
import { useTurnstile } from "@/components/rezervace/use-turnstile.tsx";
import { useClientExtraMinutes } from "@/components/rezervace/use-client-extra-minutes.ts";
import { formatTime } from "@/lib/utils.ts";

type GroupFormData = z.infer<typeof groupDataSchema>;

export function GroupBookingForm({
    boundSubmitAction,
    serviceNames,
    backHref,
    startTime,
    durationMinutes,
    initialExtraMinutes = 0,
}: {
    boundSubmitAction: (
        data: GroupFormData,
        turnstileToken: string | null
    ) => Promise<void>;
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
        formState: { errors, isSubmitting },
    } = useForm<GroupFormData>({
        resolver: zodResolver(groupDataSchema),
        mode: "onChange",
    });
    const turnstile = useTurnstile();

    async function submit(data: GroupFormData) {
        try {
            await boundSubmitAction(data, turnstile.token);
        } finally {
            turnstile.reset();
        }
    }

    const names = useWatch({ control, name: "names" });
    const phone = useWatch({ control, name: "phone" });
    // Only the main contact is a Client with its own extra time (guests get
    // 0, same as on submit).
    const extraMinutes = useClientExtraMinutes(
        names?.[0],
        phone,
        initialExtraMinutes
    );

    return (
        <form onSubmit={handleSubmit(submit)}>
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
                        Podle předchozích návštěv počítáme s časem navíc –
                        rezervace bude do{" "}
                        {formatTime(startTime + durationMinutes + extraMinutes)}{" "}
                        (místo {formatTime(startTime + durationMinutes)}).
                    </AlertDescription>
                </Alert>
            )}

            <PrivacyNotice />
            {turnstile.widget}

            <div className="mt-6 flex justify-between pb-6">
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
                    disabled={!turnstile.ready || isSubmitting}
                    size="lg"
                >
                    <Check className="size-4" />
                    Potvrdit rezervaci
                </Button>
            </div>
        </form>
    );
}
