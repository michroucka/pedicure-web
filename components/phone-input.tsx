"use client";

import { Input } from "@/components/ui/input";
import { ComponentProps } from "react";
import { formatPhoneNumber } from "@/lib/utils";

// Phone keypad on mobile and the browser's saved number on autofill; the
// formatting below also runs on autofilled values (they fire onChange).
export function PhoneInput(props: ComponentProps<typeof Input>) {
    return (
        <Input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            {...props}
            onChange={(e) => {
                e.target.value = formatPhoneNumber(e.target.value);
                props.onChange?.(e);
            }}
        />
    );
}
