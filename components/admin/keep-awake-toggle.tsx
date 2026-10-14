"use client";

import { useSyncExternalStore } from "react";
import { Switch } from "@/components/ui/switch.tsx";
import {
    Field,
    FieldContent,
    FieldDescription,
    FieldGroup,
    FieldLabel,
    FieldTitle,
} from "@/components/ui/field.tsx";
import { setKeepAwakeEnabled, useKeepAwakeEnabled } from "@/lib/keep-awake.ts";

// Browser support never changes at runtime — nothing to subscribe to.
function subscribeToNothing() {
    return () => {};
}

function getSupportSnapshot() {
    return "wakeLock" in navigator;
}

function getSupportServerSnapshot() {
    return false;
}

export function KeepAwakeToggle() {
    const enabled = useKeepAwakeEnabled();
    const isSupported = useSyncExternalStore(
        subscribeToNothing,
        getSupportSnapshot,
        getSupportServerSnapshot
    );

    return (
        <FieldGroup className="w-full">
            <FieldLabel htmlFor="switch-keep-awake">
                <Field orientation="horizontal">
                    <FieldContent>
                        <FieldTitle className="font-heading text-base font-medium">
                            Nezhasínat obrazovku
                        </FieldTitle>
                        <FieldDescription>
                            {isSupported
                                ? "Obrazovka zůstane rozsvícená, dokud je aplikace otevřená. Platí jen pro toto zařízení."
                                : "Toto zařízení nebo prohlížeč nepodporuje udržení obrazovky rozsvícené."}
                        </FieldDescription>
                    </FieldContent>
                    <Switch
                        id="switch-keep-awake"
                        checked={isSupported && enabled}
                        disabled={!isSupported}
                        onCheckedChange={setKeepAwakeEnabled}
                    />
                </Field>
            </FieldLabel>
        </FieldGroup>
    );
}
