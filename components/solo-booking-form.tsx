"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { soloSchema } from "@/app/reservation/schema.ts";
import {
    Field,
    FieldGroup,
    FieldLabel,
    FieldError,
    FieldContent,
    FieldTitle,
    FieldLegend,
    FieldSet,
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
} from "lucide-react";
import Link from "next/link";

type SoloFormData = z.infer<typeof soloSchema>;

export function SoloBookingForm({
    boundSubmitAction,
    backHref,
}: {
    boundSubmitAction: (data: SoloFormData) => Promise<void>;
    backHref: string;
}) {
    const {
        register,
        handleSubmit,
        control,
        formState: { errors },
    } = useForm<SoloFormData>({
        resolver: zodResolver(soloSchema),
        mode: "onChange",
    });

    return (
        <>
            <h1 className="mb-4 text-xl font-semibold">Kontaktní údaje</h1>
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
                                Poslat ráno v den rezervace e-mailem
                                připomínku
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
        </>
    );
}
