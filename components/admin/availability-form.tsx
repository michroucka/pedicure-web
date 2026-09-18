"use client";

import {
    useForm,
    useFieldArray,
    useWatch,
    type UseFormSetValue,
    type Control,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import {
    availabilitySchema,
    type AvailabilityFormData,
} from "@/app/(admin)/(dashboard)/dostupnost/schema.ts";
import { Button } from "@/components/ui/button.tsx";
import { Slider } from "@/components/ui/slider.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { formatTime, parseTime, roundToQuarterHour } from "@/lib/utils.ts";
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

const TRACK_MIN = 13 * 60; // 13:00
const TRACK_MAX = 20 * 60; // 20:00
const SLIDER_STEP = 15;

function BlockField({
    control,
    setValue,
    dayIndex,
    blockIndex,
    onRemove,
}: {
    control: Control<AvailabilityFormData>;
    setValue: UseFormSetValue<AvailabilityFormData>;
    dayIndex: number;
    blockIndex: number;
    onRemove: () => void;
}) {
    const block = useWatch({
        control,
        name: `days.${dayIndex}.blocks.${blockIndex}`,
    });
    const start = parseTime(block.startTime);
    const end = parseTime(block.endTime);

    function handleChange([newStart, newEnd]: number[]) {
        setValue(
            `days.${dayIndex}.blocks.${blockIndex}.startTime`,
            formatTime(newStart)
        );
        setValue(
            `days.${dayIndex}.blocks.${blockIndex}.endTime`,
            formatTime(newEnd)
        );
    }

    // Typing an exact time bypasses the slider's own min-gap enforcement,
    // so clamp here to keep start < end by at least one step.
    function typeStart(value: string) {
        if (!value) return;
        const newStart = parseTime(roundToQuarterHour(value));
        handleChange([Math.min(newStart, end - SLIDER_STEP), end]);
    }

    function typeEnd(value: string) {
        if (!value) return;
        const newEnd = parseTime(roundToQuarterHour(value));
        handleChange([start, Math.max(newEnd, start + SLIDER_STEP)]);
    }

    return (
        <div className="flex items-center gap-3 rounded-2xl border p-3">
            <div className="flex-1">
                <Slider
                    value={[start, end]}
                    onValueChange={handleChange}
                    min={Math.min(TRACK_MIN, start)}
                    max={Math.max(TRACK_MAX, end)}
                    step={SLIDER_STEP}
                    minStepsBetweenThumbs={1}
                />
                <div className="mt-2 flex justify-between gap-2">
                    <Input
                        type="time"
                        step="900"
                        lang="cs"
                        className="h-auto w-auto border-none p-0 text-sm tabular-nums text-muted-foreground shadow-none"
                        value={formatTime(start)}
                        onChange={(e) => typeStart(e.target.value)}
                    />
                    <Input
                        type="time"
                        step="900"
                        lang="cs"
                        className="h-auto w-auto border-none p-0 text-right text-sm tabular-nums text-muted-foreground shadow-none"
                        value={formatTime(end)}
                        onChange={(e) => typeEnd(e.target.value)}
                    />
                </div>
            </div>
            <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={onRemove}
            >
                <Trash2 className="size-4" />
            </Button>
        </div>
    );
}

function DayField({
    control,
    setValue,
    dayIndex,
    dayOfWeek,
}: {
    control: Control<AvailabilityFormData>;
    setValue: UseFormSetValue<AvailabilityFormData>;
    dayIndex: number;
    dayOfWeek: number;
}) {
    const { fields, append, remove } = useFieldArray({
        control,
        name: `days.${dayIndex}.blocks`,
    });
    const blocks = useWatch({ control, name: `days.${dayIndex}.blocks` });

    function addBlock() {
        const last = blocks[blocks.length - 1];
        const start = last ? parseTime(last.endTime) : TRACK_MIN;
        const end = Math.min(start + 120, TRACK_MAX);
        append({ startTime: formatTime(start), endTime: formatTime(end) });
    }

    return (
        <div className="rounded-2xl border p-3">
            <div className="mb-2 flex items-center justify-between">
                <span className="font-medium">{DAY_LABELS[dayOfWeek]}</span>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addBlock}
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
                    <BlockField
                        key={field.id}
                        control={control}
                        setValue={setValue}
                        dayIndex={dayIndex}
                        blockIndex={blockIndex}
                        onRemove={() => remove(blockIndex)}
                    />
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
    const { control, setValue, handleSubmit } =
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
                {isSaving ? (
                    <Spinner className="size-4" />
                ) : (
                    <Save className="size-4" />
                )}
                {isSaving ? "Ukládám…" : "Uložit"}
            </Button>
        </form>
    );
}
