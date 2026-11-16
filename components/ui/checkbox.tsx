"use client";

import * as React from "react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";
import { CheckIcon } from "lucide-react";

function Checkbox({
    className,
    ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
    return (
        <CheckboxPrimitive.Root
            data-slot="checkbox"
            className={cn(
                "peer relative flex size-5 shrink-0 items-center justify-center rounded-[7px] border border-transparent bg-input/90 transition-[background-color,border-color,box-shadow] duration-200 outline-none group-has-disabled/field:opacity-50 after:absolute after:-inset-x-3 after:-inset-y-3 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 aria-invalid:aria-checked:border-primary motion-reduce:transition-none dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground dark:data-checked:bg-primary",
                className
            )}
            {...props}
        >
            {/* forceMount keeps the tick in the DOM when unchecked, so it can
                animate out (scale + fade) instead of vanishing. */}
            <CheckboxPrimitive.Indicator
                forceMount
                data-slot="checkbox-indicator"
                className="grid place-content-center text-current transition-[opacity,scale] duration-200 ease-out data-[state=unchecked]:scale-50 data-[state=unchecked]:opacity-0 motion-reduce:transition-none [&>svg]:size-4"
            >
                <CheckIcon />
            </CheckboxPrimitive.Indicator>
        </CheckboxPrimitive.Root>
    );
}

export { Checkbox };
