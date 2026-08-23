"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { StepIndicator } from "@/components/rezervace/step-indicator.tsx";

const STEP_BY_PATH: Record<string, 1 | 2 | 3> = {
    "/rezervace": 1,
    "/rezervace/details": 2,
    "/rezervace/confirmed": 3,
};

export function BookingNav() {
    const pathname = usePathname();
    const currentStep = STEP_BY_PATH[pathname] ?? 1;

    return (
        <header className="sticky top-0 z-10 bg-background pt-[env(safe-area-inset-top)]">
            <div className="mx-auto max-w-5xl px-4 sm:px-6">
                <div className="flex items-center justify-center pt-8">
                    <Image
                        src="/logo-banner-light.svg"
                        alt="Nohy v cajku"
                        width={241}
                        height={60}
                        className="h-16 w-auto"
                        priority
                        draggable={false}
                    />
                </div>
                <StepIndicator currentStep={currentStep} />
            </div>
        </header>
    );
}
