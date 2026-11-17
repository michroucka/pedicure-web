"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { StepIndicator } from "@/components/rezervace/step-indicator";

const STEP_BY_PATH: Record<string, 1 | 2> = {
    "/rezervace": 1,
    "/rezervace/details": 2,
};

const MANAGE_PATH_PREFIX = "/rezervace/sprava/";

function getCurrentStep(pathname: string): 1 | 2 | 3 {
    if (pathname.startsWith(MANAGE_PATH_PREFIX)) return 3;
    return STEP_BY_PATH[pathname] ?? 1;
}

// The manage page doubles as the booking confirmation (?created=1) - only
// then is it step 3 of the wizard. Opened later from the e-mail it's just
// the booking, and a fully ticked progress bar would make no sense.
function ManagePageSteps() {
    const searchParams = useSearchParams();
    if (searchParams.get("created") !== "1") return null;
    return <StepIndicator currentStep={3} />;
}

export function BookingNav() {
    const pathname = usePathname();
    const currentStep = getCurrentStep(pathname);
    const isManagePage = pathname.startsWith(MANAGE_PATH_PREFIX);

    return (
        // Sticky only from tablet up - on a phone it would hold ~1/5 of the
        // screen while picking a slot or filling the form.
        <header className="z-10 bg-background pt-[env(safe-area-inset-top)] md:sticky md:top-0">
            <div className="mx-auto max-w-5xl px-4 sm:px-6">
                <div className="flex items-center justify-center pt-4 md:pt-8">
                    <Link href="/">
                        <Image
                            src="/logo-banner-light.svg"
                            alt="Nohy v cajku"
                            width={221}
                            height={60}
                            className="h-11 w-auto md:h-16"
                            priority
                            draggable={false}
                        />
                    </Link>
                </div>
                {isManagePage ? (
                    // useSearchParams needs a Suspense boundary - the
                    // static /rezervace page shares this layout.
                    <Suspense fallback={null}>
                        <ManagePageSteps />
                    </Suspense>
                ) : (
                    <StepIndicator currentStep={currentStep} />
                )}
            </div>
        </header>
    );
}
