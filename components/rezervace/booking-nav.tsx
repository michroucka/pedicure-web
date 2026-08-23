import Image from "next/image";

export function BookingNav() {
    return (
        <header className="sticky top-0 z-10 bg-background/90 pt-[env(safe-area-inset-top)] backdrop-blur">
            <div className="mx-auto max-w-5xl px-4 sm:px-6">
                <div className="flex items-center justify-center pt-8">
                    <Image
                        src="/logo-banner-light.svg"
                        alt="Nohy v cajku"
                        width={241}
                        height={60}
                        className="-my-1 h-16 w-auto"
                        priority
                        draggable={false}
                    />
                </div>
            </div>
        </header>
    );
}
