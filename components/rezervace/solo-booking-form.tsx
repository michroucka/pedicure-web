"use client";

import { useEffect, useState } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { soloSchema } from "@/app/reservation/schema.ts";
import { getExtraMinutesAction } from "@/app/reservation/actions.ts";
import {
    Field,
    FieldGroup,
    FieldLabel,
    FieldError,
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
} from "lucide-react";
import Link from "next/link";
import { formatTime } from "@/lib/utils.ts";

type SoloFormData = z.infer<typeof soloSchema>;

export function SoloBookingForm({
    boundSubmitAction,
    backHref,
    startTime,
    durationMinutes,
    initialExtraMinutes = 0,
}: {
    boundSubmitAction: (data: SoloFormData) => Promise<void>;
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
    } = useForm<SoloFormData>({
        resolver: zodResolver(soloSchema),
        mode: "onChange",
        defaultValues: { reminderRequested: false },
    });

    const name = useWatch({ control, name: "name" });
    const phone = useWatch({ control, name: "phone" });
    const [extraMinutes, setExtraMinutes] = useState(initialExtraMinutes);

    // Extra time is tied to an existing (name, phone) client match, which
    // is only known once both fields are filled in — so we look it up as
    // the user types, instead of surprising them with a longer slot only
    // after they submit.
    useEffect(() => {
        let cancelled = false;
        const timeout = setTimeout(() => {
            if (!name?.trim() || !phone?.trim()) {
                if (!cancelled) setExtraMinutes(0);
                return;
            }
            getExtraMinutesAction([{ name, phone }]).then((minutes) => {
                if (!cancelled) setExtraMinutes(minutes);
            });
        }, 400);
        return () => {
            cancelled = true;
            clearTimeout(timeout);
        };
    }, [name, phone]);

    return (
        <>
            {extraMinutes > 0 && extraMinutes !== initialExtraMinutes && (
                <Alert
                    variant="info"
                    className="mb-4 -mt-4"
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
            <form onSubmit={handleSubmit(boundSubmitAction)}>
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
        </>
    );
}
