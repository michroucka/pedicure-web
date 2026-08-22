"use client";

import {
    createContext,
    useContext,
    useEffect,
    useRef,
    useState,
    type ReactNode,
} from "react";

// Radix portals (Select, Popover, Dialog, ...) render into document.body by
// default, which escapes any CSS-variable-scoped theme (e.g. .storefront)
// applied to a wrapper div further down the tree. Rendering the portal into
// a node inside that wrapper instead keeps it themed correctly.
const PortalContainerContext = createContext<HTMLElement | null>(null);

export function usePortalContainer() {
    return useContext(PortalContainerContext);
}

export function PortalContainerProvider({
    className,
    children,
}: {
    className?: string;
    children: ReactNode;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const [container, setContainer] = useState<HTMLElement | null>(null);

    useEffect(() => {
        setContainer(ref.current);
    }, []);

    return (
        <div
            ref={ref}
            className={className}
        >
            <PortalContainerContext.Provider value={container}>
                {children}
            </PortalContainerContext.Provider>
        </div>
    );
}
