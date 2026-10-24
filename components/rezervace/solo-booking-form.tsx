"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { soloDataSchema } from "@/app/rezervace/schema.ts";
import {
    Field,
    FieldGroup,
    FieldLabel,
    FieldError,
} from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { PhoneInput } from "@/components/phone-input.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert.tsx";
import { Check, ChevronLeft, Info, Mail, Phone, UserRound } from "lucide-react";
import Link from "next/link";
import { PrivacyNotice } from "@/components/rezervace/privacy-notice.tsx";
import { useTurnstile } from "@/components/rezervace/use-turnstile.tsx";
import { useClientExtraMinutes } from "@/components/rezervace/use-client-extra-minutes.ts";
import { formatTime } from "@/lib/utils.ts";

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
        formState: { errors, isSubmitting },
    } = useForm<SoloFormData>({
        resolver: zodResolver(soloDataSchema),
        mode: "onChange",
    });
    const turnstile = useTurnstile();

    async function submit(data: SoloFormData) {
        try {
            await boundSubmitAction(data, turnstile.token);
        } finally {
            turnstile.reset();
        }
    }

    const name = useWatch({ control, name: "name" });
    const phone = useWatch({ control, name: "phone" });
    const extraMinutes = useClientExtraMinutes(
        name,
        phone,
        initialExtraMinutes
    );

    return (
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
                        {formatTime(startTime + durationMinutes + extraMinutes)}{" "}
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
                            Jméno
                        </FieldLabel>
                        <Input
                            id="name"
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
        </>
    );
}
