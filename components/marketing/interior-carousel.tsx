"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import Autoplay from "embla-carousel-autoplay";
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    type CarouselApi,
} from "@/components/ui/carousel.tsx";
import { cn } from "@/lib/utils.ts";

const PHOTOS = [
    { src: "/interier-1.jpg", alt: "Interiér provozovny Nohy v cajku v Kralovicích" },
    { src: "/interier-2.jpg", alt: "Pracovní místo pro pedikúru v provozovně Nohy v cajku" },
    { src: "/exterier.jpg", alt: "Vstup do provozovny Nohy v cajku, Boženy Němcové 204, Kralovice" },
];

export function InteriorCarousel() {
    const [api, setApi] = useState<CarouselApi>();
    const [selected, setSelected] = useState(0);

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
            plugins={[Autoplay({ delay: 6000, stopOnInteraction: false })]}
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

            <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2">
                {PHOTOS.map((photo, i) => (
                    <button
                        key={photo.src}
                        type="button"
                        aria-label={`Přejít na fotku ${i + 1}`}
                        onClick={() => api?.scrollTo(i)}
                        className={cn(
                            "size-2 rounded-full transition-colors",
                            i === selected ? "bg-white" : "bg-white/40"
                        )}
                    />
                ))}
            </div>
        </Carousel>
    );
}
