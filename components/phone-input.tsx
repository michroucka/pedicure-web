"use client";

import { Input } from "@/components/ui/input";
import { ComponentProps } from "react";
import { formatPhoneNumber } from "@/lib/utils";

export function PhoneInput(props: ComponentProps<typeof Input>) {
    return (
        <Input
            {...props}
            onChange={(e) => {
                e.target.value = formatPhoneNumber(e.target.value);
                props.onChange?.(e);
            }}
        />
    );
}
