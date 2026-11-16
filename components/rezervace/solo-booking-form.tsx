"use client";

import { useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Spinner } from "@/components/ui/spinner";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { soloDataSchema } from "@/app/rezervace/schema";
import {
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
    FieldError,
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

type SoloFormData = z.infer<typeof soloDataSchema>;

export function SoloBookingForm({
    boundSubmitAction,
    backHref,
    startTime,
    durationMinutes,
    initialExtraMinutes = 0,
}: {
    boundSubmitAction: (
        data: SoloFormData,
        turnstileToken: string | null
    ) => Promise<void>;
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
    } = useForm<SoloFormData>({
        resolver: zodResolver(soloDataSchema),
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

    useRestoreBookingDraft((draft) =>
        reset({
            name: draft.names[0] ?? "",
            phone: draft.phone,
            email: draft.email,
        })
    );

    function submit(data: SoloFormData) {
        saveBookingDraft({
            names: [data.name],
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

    const name = useWatch({ control, name: "name" });
    const phone = useWatch({ control, name: "phone" });
    const extraMinutes = useClientExtraMinutes(
        name,
        phone,
        initialExtraMinutes
    );

    return (
        <CzechText>
            <>
                {extraMinutes > 0 && extraMinutes !== initialExtraMinutes && (
                    <Alert
                        variant="info"
                        className="-mt-4 mb-4"
                    >
                        <Info />
                        <AlertTitle>Delší rezervace</AlertTitle>
                        <AlertDescription>
                            Podle předchozí návštěvy počítáme s časem navíc -
                            rezervace bude do{" "}
                            {formatTime(
                                startTime + durationMinutes + extraMinutes
                            )}{" "}
                            (místo {formatTime(startTime + durationMinutes)}).
                        </AlertDescription>
                    </Alert>
                )}
                <h3 className="mb-4">Kontaktní údaje</h3>
                <form onSubmit={handleSubmit(submit)}>
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
                                {...register("name")}
                            />
                            <FieldError errors={[errors.name]} />
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
                                Ráno v den termínu Vám pošleme SMS připomínku.
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
                                Pošleme Vám potvrzení s odkazem pro změnu nebo
                                zrušení rezervace.
                            </FieldDescription>
                            <FieldError errors={[errors.email]} />
                        </Field>
                    </FieldGroup>

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
            </>
        </CzechText>
    );
}
