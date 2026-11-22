"use client";

import { ReactNode, useState } from "react";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { UsersRound, CalendarDays, Clock } from "lucide-react";
import { CzechText } from "@/components/czech-text";
import { cn } from "@/lib/utils";

const STEPS = [
    { label: "Kdo přijde?", icon: UsersRound },
    { label: "Kdy?", icon: CalendarDays },
    { label: "V kolik?", icon: Clock },
];

export function StepCard({
    children,
    thisStep,
    activeStep,
    gen,
    summary,
    headerAside,
    collapsible,
}: {
    children: ReactNode;
    thisStep: number;
    activeStep: number;
    gen: number;
    summary?: string;
    // Extra detail on the right of the header while the step is open.
    headerAside?: ReactNode;
    collapsible: boolean;
}) {
    const [open, setOpen] = useState(thisStep === activeStep);
    const [prevGen, setPrevGen] = useState(gen);
    const Icon = STEPS[thisStep].icon;

    if (gen !== prevGen) {
        setPrevGen(gen);
        if (thisStep === activeStep) setOpen(true);
        if (thisStep < activeStep) setOpen(false);
    }

    return (
        <CzechText>
            <Accordion
                type="single"
                collapsible={collapsible}
                value={open ? thisStep.toString() : ""}
                onValueChange={(v) => {
                    setOpen(!!v);
                }}
                className="mb-2"
            >
                <AccordionItem value={thisStep?.toString()}>
                    <AccordionTrigger
                        className={cn(
                            "items-center hover:no-underline",
                            // The chevron nudges the way the card will move.
                            // An open card gets no background on hover - it
                            // would cut a hard edge against its content.
                            !open &&
                                "cursor-pointer hover:bg-muted hover:[&_[data-slot=accordion-trigger-icon]]:translate-y-px hover:[&_[data-slot=accordion-trigger-icon]]:text-foreground",
                            // An open step that can't collapse does nothing
                            // on click, so it shouldn't look clickable.
                            open &&
                                collapsible &&
                                "cursor-pointer hover:[&_[data-slot=accordion-trigger-icon]]:-translate-y-px hover:[&_[data-slot=accordion-trigger-icon]]:text-foreground",
                            !collapsible &&
                                "[&_[data-slot=accordion-trigger-icon]]:hidden",
                            // The chevron is pushed right with ml-auto; with an
                            // aside the aside takes that role, or the free
                            // space would be split between the two.
                            open &&
                                headerAside &&
                                "[&_[data-slot=accordion-trigger-icon]]:ml-0"
                        )}
                    >
                        <span className="flex items-center gap-2">
                            <Icon className="size-4 shrink-0" />
                            {!open && summary ? summary : STEPS[thisStep].label}
                        </span>
                        {open && headerAside && (
                            <span className="ms-auto self-center text-xs font-normal text-muted-foreground">
                                {headerAside}
                            </span>
                        )}
                    </AccordionTrigger>
                    <AccordionContent>{children}</AccordionContent>
                </AccordionItem>
            </Accordion>
        </CzechText>
    );
}
