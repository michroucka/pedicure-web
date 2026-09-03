// Shared fixed-position container for floating action buttons on the
// kalendář page (currently "Přidat rezervaci" + "QR platba") — new buttons
// just become another child instead of each carrying its own `fixed`
// positioning/offset math.
export function FloatingActions({ children }: { children: React.ReactNode }) {
    return (
        <div className="fixed right-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-10 flex items-center gap-3">
            {children}
        </div>
    );
}
