"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    type ReactNode,
    type RefObject,
} from "react";

export type AddBookingPrefill = { date: Date; startMinutes: number };
type AddBookingOpener = (prefill: AddBookingPrefill) => void;

// Lets the timelines open the one AddBookingDialog (rendered next to the
// floating button) prefilled with a tapped day and time, without lifting
// all of the dialog's form state up into the page.
const OpenerContext = createContext<RefObject<AddBookingOpener | null> | null>(
    null
);

export function AddBookingLauncherProvider({
    children,
}: {
    children: ReactNode;
}) {
    const openerRef = useRef<AddBookingOpener | null>(null);
    return <OpenerContext value={openerRef}>{children}</OpenerContext>;
}

export function useOpenAddBooking() {
    const openerRef = useContext(OpenerContext);
    return useCallback(
        (prefill: AddBookingPrefill) => openerRef?.current?.(prefill),
        [openerRef]
    );
}

// Called by AddBookingDialog with its own "open prefilled" function.
export function useRegisterAddBookingOpener(opener: AddBookingOpener) {
    const openerRef = useContext(OpenerContext);
    useEffect(() => {
        if (!openerRef) return;
        openerRef.current = opener;
        return () => {
            openerRef.current = null;
        };
    });
}
