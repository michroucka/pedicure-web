"use client";

import {
    useForm,
    useFieldArray,
    type UseFormRegister,
    type UseFormSetValue,
    type Control,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import {
    availabilitySchema,
    type AvailabilityFormData,
} from "@/app/admin/(dashboard)/availability/schema.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { roundToQuarterHour } from "@/lib/utils.ts";
import { Plus, Trash2, Save } from "lucide-react";

const DAY_LABELS: Record<number, string> = {
    0: "Neděle",
    1: "Pondělí",
    2: "Úterý",
    3: "Středa",
    4: "Čtvrtek",
    5: "Pátek",
    6: "Sobota",
};

function DayField({
    register,
    control,
    setValue,
    dayIndex,
    dayOfWeek,
}: {
    register: UseFormRegister<AvailabilityFormData>;
    control: Control<AvailabilityFormData>;
    setValue: UseFormSetValue<AvailabilityFormData>;
    dayIndex: number;
    dayOfWeek: number;
}) {
    const { fields, append, remove } = useFieldArray({
        control,
        name: `days.${dayIndex}.blocks`,
    });

    return (
        <div className="rounded-2xl border p-3">
            <div className="mb-2 flex items-center justify-between">
                <span className="font-medium">{DAY_LABELS[dayOfWeek]}</span>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                        append({ startTime: "15:00", endTime: "19:00" })
                    }
                >
                    <Plus className="size-4" />
                    Blok
                </Button>
            </div>

            {fields.length === 0 && (
                <p className="text-sm text-muted-foreground">Zavřeno</p>
            )}

            <div className="flex flex-col gap-2">
                {fields.map((field, blockIndex) => (
                    <div
                        key={field.id}
                        className="flex items-center gap-2"
                    >
                        <Input
                            type="time"
                            step="900"
                            lang="cs"
                            className="w-auto"
                            {...register(
                                `days.${dayIndex}.blocks.${blockIndex}.startTime`,
                                {
                                    onBlur: (e) =>
                                        setValue(
                                            `days.${dayIndex}.blocks.${blockIndex}.startTime`,
                                            roundToQuarterHour(e.target.value)
                                        ),
                                }
                            )}
                        />
                        <span className="text-foreground">–</span>
                        <Input
                            type="time"
                            step="900"
                            lang="cs"
                            className="w-auto"
                            {...register(
                                `days.${dayIndex}.blocks.${blockIndex}.endTime`,
                                {
                                    onBlur: (e) =>
                                        setValue(
                                            `days.${dayIndex}.blocks.${blockIndex}.endTime`,
                                            roundToQuarterHour(e.target.value)
                                        ),
                                }
                            )}
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => remove(blockIndex)}
                        >
                            <Trash2 className="size-4" />
                        </Button>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function AvailabilityForm({
    days,
    saveAction,
}: {
    days: {
        dayOfWeek: number;
        blocks: { startTime: string; endTime: string }[];
    }[];
    saveAction: (data: AvailabilityFormData) => Promise<void>;
}) {
    const { register, control, setValue, handleSubmit } =
        useForm<AvailabilityFormData>({
            resolver: zodResolver(availabilitySchema),
            defaultValues: { days },
        });
    const [isSaving, startTransition] = useTransition();

    function onSubmit(data: AvailabilityFormData) {
        startTransition(async () => {
            await saveAction(data);
        });
    }

    return (
        <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-2"
        >
            {days.map((day, index) => (
                <DayField
                    key={day.dayOfWeek}
                    register={register}
                    control={control}
                    setValue={setValue}
                    dayIndex={index}
                    dayOfWeek={day.dayOfWeek}
                />
            ))}

            <Button
                type="submit"
                disabled={isSaving}
                className="mt-2"
                size="lg"
            >
                <Save className="size-4" />
                {isSaving ? "Ukládám…" : "Uložit"}
            </Button>
        </form>
    );
}
