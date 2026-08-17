import { ReactNode } from "react";

export default function ReservationLayout({
    children,
                                          }: {
    children: ReactNode;
}) {
    return <div className="mt-8">
        {children}
    </div>;
}