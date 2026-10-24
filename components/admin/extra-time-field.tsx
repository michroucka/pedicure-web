"use client";

import { Checkbox } from "@/components/ui/checkbox.tsx";
import { Input } from "@/components/ui/input.tsx";
import { EXTRA_TIME_STEP, normalizeExtraMinutes } from "@/lib/extra-time.ts";

export const DEFAULT_EXTRA_MINUTES = 15;

// Kept as checkbox + minutes (not just a number) so clearing the input
// while typing doesn't untick the checkbox and hide the field under the
// admin's fingers – 0 minutes only ever comes from unticking.
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
    label = "Čas navíc",
}: {
    value: ExtraTime;
    onChange: (value: ExtraTime) => void;
    label?: string;
}) {
    return (
        // min-h matches the input's height, so ticking the checkbox doesn't
        // make the row (and everything below it) jump
        <div className="flex min-h-8 items-center gap-3">
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
                        min={EXTRA_TIME_STEP}
                        step={EXTRA_TIME_STEP}
                        className="w-20"
                        value={value.minutes}
                        onChange={(e) =>
                            onChange({
                                ...value,
                                minutes: Number(e.target.value) || 0,
                            })
                        }
                        // step only drives the arrows – snap whatever was
                        // typed to a multiple of 5 once she leaves the
                        // field, so what she sees is what gets saved (the
                        // server normalizes the same way). Ticked means
                        // some extra time, so never below one step; 0 is
                        // what unticking is for.
                        onBlur={() =>
                            onChange({
                                ...value,
                                minutes: Math.max(
                                    EXTRA_TIME_STEP,
                                    normalizeExtraMinutes(value.minutes)
                                ),
                            })
                        }
                    />
                    <span className="text-sm text-muted-foreground">min</span>
                </div>
            )}
        </div>
    );
}
