"use client";

import { useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Spinner } from "@/components/ui/spinner";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { groupDataSchema } from "@/app/rezervace/schema";
import {
    Field,
    FieldDescription,
    FieldLabel,
    FieldError,
    FieldGroup,
    FieldLegend,
    FieldSet,
    FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/phone-input";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Check, ChevronLeft, Info, Mail, Phone, UserRound } from "lucide-react";
import Link from "next/link";
import { PrivacyNotice } from "@/components/rezervace/privacy-notice";
import { useTurnstile } from "@/components/rezervace/use-turnstile";
import { useClientExtraMinutes } from "@/components/rezervace/use-client-extra-minutes";
import { formatTime } from "@/lib/utils";
import { CzechText } from "@/components/czech-text";
import {
    saveBookingDraft,
    useRestoreBookingDraft,
} from "@/components/rezervace/use-booking-draft";

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
        reset,
        formState: { errors, isSubmitting },
    } = useForm<GroupFormData>({
        resolver: zodResolver(groupDataSchema),
        // Check a field once it has been left, then live while it is wrong –
        // not while the first attempt is still being typed.
        mode: "onTouched",
    });
    const turnstile = useTurnstile();

    // isSubmitting alone ends when the action returns, but the redirect to
    // the confirmation page takes a moment longer - the transition stays
    // pending until that navigation lands.
    const [isRedirecting, startRedirectTransition] = useTransition();
    const isBusy = isSubmitting || isRedirecting;

    // The draft may come from a different group size (the client went back
    // and added or removed someone) - fill only the people still here.
    useRestoreBookingDraft((draft) =>
        reset({
            names: serviceNames.map((_, i) => draft.names[i] ?? ""),
            phone: draft.phone,
            email: draft.email,
        })
    );

    function submit(data: GroupFormData) {
        saveBookingDraft({
            names: data.names,
            phone: data.phone,
            email: data.email,
        });
        startRedirectTransition(async () => {
            try {
                await boundSubmitAction(data, turnstile.token);
            } finally {
                turnstile.reset();
            }
        });
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
        <CzechText>
            <form onSubmit={handleSubmit(submit)}>
                <FieldGroup>
                    <FieldSet>
                        <FieldLegend>
                            Osoba 1 – hlavní kontakt{" "}
                            <span className="font-normal text-muted-foreground">
                                · {serviceNames[0]}
                            </span>
                        </FieldLegend>
                        <FieldGroup>
                            <Field>
                                <FieldLabel htmlFor="name">
                                    <UserRound className="size-4" />
                                    Jméno a příjmení
                                </FieldLabel>
                                <Input
                                    id="name"
                                    autoComplete="name"
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
                                <FieldDescription className="text-xs">
                                    Ráno v den termínu Vám pošleme SMS
                                    připomínku.
                                </FieldDescription>
                                <FieldError errors={[errors.phone]} />
                            </Field>

                            <Field>
                                <FieldLabel htmlFor="email">
                                    <Mail className="size-4" />
                                    E-mail
                                </FieldLabel>
                                <Input
                                    id="email"
                                    type="email"
                                    autoComplete="email"
                                    placeholder="jana.novakova@seznam.cz"
                                    {...register("email")}
                                />
                                <FieldDescription className="text-xs">
                                    Pošleme Vám potvrzení s odkazem pro změnu
                                    nebo zrušení rezervace.
                                </FieldDescription>
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
                                            <UserRound className="size-4" />
                                            {`Osoba ${personIndex + 1}`}
                                            <span className="font-normal text-muted-foreground">
                                                · {serviceName}
                                            </span>
                                        </FieldLabel>
                                        <Input
                                            id={`names.${personIndex}`}
                                            // Other people in the group – the
                                            // browser would offer the user's
                                            // own name here.
                                            autoComplete="off"
                                            placeholder="Jméno a příjmení"
                                            {...register(
                                                `names.${personIndex}`
                                            )}
                                        />
                                        <FieldError
                                            errors={[
                                                errors.names?.[personIndex],
                                            ]}
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
                            {formatTime(
                                startTime + durationMinutes + extraMinutes
                            )}{" "}
                            (místo {formatTime(startTime + durationMinutes)}).
                        </AlertDescription>
                    </Alert>
                )}

                <PrivacyNotice />
                {turnstile.widget}

                <div className="mt-6 flex justify-between">
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
                        disabled={!turnstile.ready || isBusy}
                        size="lg"
                    >
                        {isBusy ? (
                            <Spinner className="size-4" />
                        ) : (
                            <Check className="size-4" />
                        )}
                        {isBusy ? "Odesílám…" : "Potvrdit rezervaci"}
                    </Button>
                </div>
            </form>
        </CzechText>
    );
}
