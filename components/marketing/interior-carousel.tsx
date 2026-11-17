"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import Autoplay from "embla-carousel-autoplay";
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
    type CarouselApi,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

const PHOTOS = [
    {
        src: "/interier-1.jpg",
        alt: "Interiér provozovny Nohy v cajku v Kralovicích",
    },
    {
        src: "/interier-2.jpg",
        alt: "Pracovní místo pro pedikúru v provozovně Nohy v cajku",
    },
    {
        src: "/exterier.jpg",
        alt: "Vstup do provozovny Nohy v cajku, Boženy Němcové 204, Kralovice",
    },
];

const AUTOPLAY_DELAY_MS = 6000;

// No autoplay with reduced motion. It pauses while hovered or focused and
// stops for good once the visitor swipes or clicks a dot or an arrow (the
// pointerdown below - the plugin's own stopOnInteraction only watches the
// slides, not the dots and arrows).
// Read in the state initializer, which runs in the browser on hydration -
// plugins don't affect the server-rendered markup.
function createPlugins() {
    const prefersReducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    return prefersReducedMotion
        ? []
        : [
              Autoplay({
                  delay: AUTOPLAY_DELAY_MS,
                  stopOnMouseEnter: true,
              }),
          ];
}

export function InteriorCarousel() {
    const [api, setApi] = useState<CarouselApi>();
    const [selected, setSelected] = useState(0);
    const [plugins] = useState(createPlugins);

    useEffect(() => {
        if (!api) return;
        const onSelect = () => setSelected(api.selectedScrollSnap());
        api.on("select", onSelect);
        return () => {
            api.off("select", onSelect);
        };
    }, [api]);

    return (
        <Carousel
            setApi={setApi}
            opts={{ loop: true }}
            plugins={plugins}
            onPointerDownCapture={() => api?.plugins().autoplay?.stop()}
        >
            <CarouselContent className="ml-0">
                {PHOTOS.map((photo) => (
                    <CarouselItem
                        key={photo.src}
                        className="relative h-72 overflow-hidden rounded-4xl bg-muted pl-0 sm:h-96 md:h-112"
                    >
                        <Image
                            src={photo.src}
                            alt={photo.alt}
                            fill
                            sizes="(min-width: 768px) 45vw, 90vw"
                            className="object-cover"
                        />
                    </CarouselItem>
                ))}
            </CarouselContent>

            <CarouselPrevious
                aria-label="Předchozí fotka"
                size="icon"
                className="left-3 border-none bg-background/70 backdrop-blur-sm max-md:hidden"
            />
            <CarouselNext
                aria-label="Další fotka"
                size="icon"
                className="right-3 border-none bg-background/70 backdrop-blur-sm max-md:hidden"
            />

            {/* 44px tap target per dot, the visible dot stays small. */}
            <div className="absolute inset-x-0 bottom-1 flex justify-center">
                {PHOTOS.map((photo, i) => (
                    <button
                        key={photo.src}
                        type="button"
                        aria-label={`Přejít na fotku ${i + 1}`}
                        aria-current={i === selected ? "true" : undefined}
                        onClick={() => api?.scrollTo(i)}
                        className="group grid size-11 place-items-center"
                    >
                        <span
                            className={cn(
                                "size-2.5 rounded-full shadow-sm ring-1 ring-black/25 transition-colors",
                                i === selected
                                    ? "bg-white"
                                    : "bg-white/50 group-hover:bg-white/80"
                            )}
                        />
                    </button>
                ))}
            </div>
        </Carousel>
    );
}
