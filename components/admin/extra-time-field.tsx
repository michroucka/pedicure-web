"use client";

import { Checkbox } from "@/components/ui/checkbox.tsx";
import { Input } from "@/components/ui/input.tsx";

export const DEFAULT_EXTRA_MINUTES = 15;

// Kept as checkbox + minutes (not just a number) so clearing the input
// while typing doesn't untick the checkbox and hide the field under the
// admin's fingers — 0 minutes only ever comes from unticking.
export type ExtraTime = { enabled: boolean; minutes: number };

export const NO_EXTRA_TIME: ExtraTime = {
    enabled: false,
    minutes: DEFAULT_EXTRA_MINUTES,
};

export function extraTimeFromMinutes(minutes: number): ExtraTime {
    return minutes > 0 ? { enabled: true, minutes } : NO_EXTRA_TIME;
}

export function extraTimeToMinutes(extraTime: ExtraTime): number {
    return extraTime.enabled ? extraTime.minutes : 0;
}

export function ExtraTimeField({
    value,
    onChange,
    label = "Trvá to déle",
}: {
    value: ExtraTime;
    onChange: (value: ExtraTime) => void;
    label?: string;
}) {
    return (
        <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2">
                <Checkbox
                    checked={value.enabled}
                    onCheckedChange={(v) =>
                        onChange({ ...value, enabled: !!v })
                    }
                />
                <span className="text-sm">{label}</span>
            </label>

            {value.enabled && (
                <div className="flex items-center gap-2">
                    <Input
                        type="number"
                        min={5}
                        step={5}
                        className="w-20"
                        value={value.minutes}
                        onChange={(e) =>
                            onChange({
                                ...value,
                                minutes: Number(e.target.value) || 0,
                            })
                        }
                    />
                    <span className="text-sm text-muted-foreground">
                        minut navíc
                    </span>
                </div>
            )}
        </div>
    );
}
