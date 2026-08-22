"use client"

import { ReactNode, useState } from "react";
import {
    Accordion,
    AccordionContent,
    AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion.tsx";
import { UsersRound, CalendarDays, Clock } from "lucide-react";

const STEPS = [
    { label: "Kdo přijde?", icon: UsersRound },
    { label: "Kdy?", icon: CalendarDays },
    { label: "V kolik?", icon: Clock },
];

export function StepCard(
    { children, thisStep, activeStep, gen, summary, collapsible }:
    {
        children: ReactNode;
        thisStep: number;
        activeStep: number;
        gen: number;
        summary?: string;
        collapsible: boolean;
    }
) {
    const [open, setOpen] = useState(thisStep === activeStep);
    const [prevGen, setPrevGen] = useState(gen);
    const Icon = STEPS[thisStep].icon;

    if (gen !== prevGen) {
        setPrevGen(gen);
        if (thisStep === activeStep) setOpen(true);
        if (thisStep < activeStep) setOpen(false);
    }

    return (
        <Accordion
          type="single"
          collapsible={collapsible}
          value={open ? thisStep.toString() : ""}
          onValueChange={(v) => {setOpen(!!v)}}
          className="mb-2"
        >
            <AccordionItem value={thisStep?.toString()}>
                <AccordionTrigger className={`hover:no-underline ${collapsible ? "" : "[&_[data-slot=accordion-trigger-icon]]:hidden"}`}>
                    <span className="flex items-center gap-2">
                        <Icon className="size-4 shrink-0" />
                        {!open && summary ? summary : STEPS[thisStep].label}
                    </span>
                </AccordionTrigger>
                <AccordionContent>
                    {children}
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    )
}