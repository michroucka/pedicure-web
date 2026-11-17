"use client";

import {
    useForm,
    useFieldArray,
    useFormState,
    useWatch,
    type UseFormSetValue,
    type Control,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import {
    availabilitySchema,
    type AvailabilityFormData,
} from "@/app/(admin)/(dashboard)/dostupnost/schema";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { TimePicker } from "@/components/ui/time-picker";
import { TIME_PICKER_COMMIT_DELAY_MS } from "@/lib/time-picker-commit-delay";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { formatTime, parseTime, roundToQuarterHour } from "@/lib/utils";
import { AlertCircle, Plus, Trash2 } from "lucide-react";
import {
    UnsavedChangesBar,
    useConfirmLeaveWhenDirty,
    useSavedNotice,
} from "@/components/admin/unsaved-changes-bar";

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
            formatTime(newStart),
            { shouldDirty: true }
        );
        setValue(
            `days.${dayIndex}.blocks.${blockIndex}.endTime`,
            formatTime(newEnd),
            { shouldDirty: true }
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
        <div className="flex items-center gap-3 rounded-xl bg-muted/60 p-3">
            <div className="flex-1">
                <Slider
                    value={[start, end]}
                    onValueChange={handleChange}
                    min={Math.min(TRACK_MIN, start)}
                    max={Math.max(TRACK_MAX, end)}
                    step={SLIDER_STEP}
                    minStepsBetweenThumbs={1}
                />
                <div className="mt-3 flex justify-between gap-2">
                    <TimePicker
                        commitDelay={TIME_PICKER_COMMIT_DELAY_MS}
                        step={SLIDER_STEP}
                        icon={null}
                        variant="ghost"
                        max={formatTime(end - SLIDER_STEP)}
                        value={formatTime(start)}
                        onChange={typeStart}
                    />
                    <TimePicker
                        commitDelay={TIME_PICKER_COMMIT_DELAY_MS}
                        step={SLIDER_STEP}
                        icon={null}
                        variant="ghost"
                        className="text-right"
                        min={formatTime(start + SLIDER_STEP)}
                        value={formatTime(end)}
                        onChange={typeEnd}
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
    // daySchema's overlap check is an error on the blocks array itself, not
    // on one block – zodResolver files it under `root` for a field array.
    const { errors } = useFormState({
        control,
        name: `days.${dayIndex}.blocks`,
    });
    const blocksError =
        errors.days?.[dayIndex]?.blocks?.root?.message ??
        errors.days?.[dayIndex]?.blocks?.message;

    function addBlock() {
        const last = blocks[blocks.length - 1];
        const start = last ? parseTime(last.endTime) : TRACK_MIN;
        const end = Math.min(start + 120, TRACK_MAX);
        append({ startTime: formatTime(start), endTime: formatTime(end) });
    }

    return (
        // One row per day: name and "add" on the left keep the slider at
        // full width, and the whole week fits on a landscape tablet.
        <div className="flex flex-col gap-2 py-3 lg:grid lg:grid-cols-[9rem_1fr] lg:gap-4">
            <div className="flex items-center justify-between gap-2 lg:flex-col lg:items-start lg:justify-start">
                <span className="font-medium">{DAY_LABELS[dayOfWeek]}</span>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addBlock}
                >
                    <Plus className="size-4" />
                    Přidat blok
                </Button>
            </div>

            <div className="flex flex-col gap-2">
                {fields.length === 0 && (
                    <p className="text-sm text-muted-foreground lg:py-2">
                        Zavřeno
                    </p>
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

                {blocksError && (
                    <Alert
                        variant="destructive"
                        className="mt-2"
                    >
                        <AlertCircle />
                        <AlertTitle>{blocksError}</AlertTitle>
                    </Alert>
                )}
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
    const {
        control,
        setValue,
        handleSubmit,
        reset,
        formState: { isDirty },
    } = useForm<AvailabilityFormData>({
        resolver: zodResolver(availabilitySchema),
        defaultValues: { days },
    });
    const [isSaving, startTransition] = useTransition();
    const { isSavedNoticeShown, showSavedNotice } = useSavedNotice();
    useConfirmLeaveWhenDirty(isDirty);

    function onSubmit(data: AvailabilityFormData) {
        startTransition(async () => {
            await saveAction(data);
            reset(data);
            showSavedNotice();
        });
    }

    return (
        <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-2"
        >
            <div className="divide-y rounded-2xl border px-4">
                {days.map((day, index) => (
                    <DayField
                        key={day.dayOfWeek}
                        control={control}
                        setValue={setValue}
                        dayIndex={index}
                        dayOfWeek={day.dayOfWeek}
                    />
                ))}
            </div>

            <UnsavedChangesBar
                isDirty={isDirty}
                isSaving={isSaving}
                isSavedNoticeShown={isSavedNoticeShown}
                // No arguments: back to the last saved values (reset(data)
                // after a save makes those the new defaults).
                onDiscard={() => reset()}
            />
        </form>
    );
}
